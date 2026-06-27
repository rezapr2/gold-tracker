import { Inject, Injectable, Logger, OnApplicationBootstrap, Optional } from '@nestjs/common';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { CronTime } from 'cron';
import { ClientProxy } from '@nestjs/microservices';
import {
  EVENTS_CLIENT,
  RoutingKey,
  PriceFetchedEvent,
  Asset,
  assetsForFetcher,
  ServiceName,
  CircuitBreaker,
  mapWithConcurrency,
  RedisService,
  HeartbeatService,
} from '@gold-tracker/shared';
import { PriceProvider, GoldPriceData } from '../providers/price-provider.interface';
import { TwelveDataProvider } from '../providers/twelve-data.provider';
import { SettingsStoreService } from '../settings/settings-store.service';

const FETCH_CONCURRENCY = 2;
const CRON_NAME = 'fetchOil';

/**
 * Runs the crude-oil provider loop on a schedule and publishes a `price.fetched`
 * event per benchmark (WTI, Brent). No DB — core persists. A cross-instance Redis
 * lock keeps a single replica fetching per tick; the cron interval follows the
 * admin setting and is re-applied on `settings.changed`.
 */
@Injectable()
export class FetchService implements OnApplicationBootstrap {
  private readonly logger = new Logger(FetchService.name);
  private readonly breaker = new CircuitBreaker();
  private readonly providers: PriceProvider[];
  // Assets this fetcher owns, per the registry (WTI, BRENT).
  private readonly assets: Asset[] = assetsForFetcher(ServiceName.FetcherOil);
  private readonly lastFetch: Record<string, string> = {};

  constructor(
    twelveData: TwelveDataProvider,
    private readonly settings: SettingsStoreService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly heartbeat: HeartbeatService,
    @Inject(EVENTS_CLIENT) private readonly events: ClientProxy,
    @Optional() private readonly redis?: RedisService,
  ) {
    this.providers = [twelveData];
  }

  async onApplicationBootstrap(): Promise<void> {
    this.heartbeat.setDetailProvider(() => ({
      assets: this.assets,
      lastFetch: this.lastFetch,
      breakerOpen: this.breaker.openKeys(),
    }));
    await this.applyInterval();
  }

  /** Re-points the cron at the admin-configured interval (hot-reloadable). */
  async applyInterval(): Promise<void> {
    const expr = await this.settings.priceFetchInterval();
    try {
      const job = this.schedulerRegistry.getCronJob(CRON_NAME);
      job.stop();
      job.setTime(new CronTime(expr));
      job.start();
      this.logger.log(`Fetch cron scheduled at '${expr}'`);
    } catch (error: any) {
      this.logger.warn(`Failed to reschedule fetch cron: ${error.message}`);
    }
  }

  @Cron('*/1 * * * *', { name: CRON_NAME })
  async fetchPrices(): Promise<void> {
    if (!(await this.settings.isFetcherEnabled(ServiceName.FetcherOil))) {
      this.logger.debug('fetch-oil paused by admin — skipping tick');
      return;
    }
    const assets = await this.settings.enabledAssets(this.assets);
    if (assets.length === 0) {
      this.logger.debug('fetch-oil: all assets disabled — skipping tick');
      return;
    }
    const run = async () => {
      await mapWithConcurrency(assets, FETCH_CONCURRENCY, async (asset) => {
        try {
          const data = await this.fetchOne(asset);
          if (data) {
            this.events.emit(RoutingKey.PriceFetched, this.toEvent(data));
            this.lastFetch[asset] = new Date().toISOString();
          }
        } catch (error: any) {
          this.logger.error(`Fetch failed for ${asset}: ${error.message}`);
        }
      });
    };
    if (this.redis) {
      const ran = await this.redis.runExclusive('cron-lock:fetch-oil', 50_000, run);
      if (!ran) this.logger.debug('fetch-oil skipped — another replica holds the lock');
    } else {
      await run();
    }
  }

  /** Provider failover for one asset, honouring the per-provider circuit breaker. */
  private async fetchOne(asset: Asset): Promise<GoldPriceData | null> {
    const providers = this.providers.filter((p) => p.supports(asset));
    for (const provider of providers) {
      const key = `${provider.name}:${asset}`;
      if (this.breaker.isOpen(key)) continue;
      const result = await provider.fetchPrice(asset);
      if (result) {
        this.breaker.recordSuccess(key);
        return result;
      }
      this.breaker.recordFailure(key);
    }
    this.logger.warn(`All providers failed (or circuit-broken) for ${asset}`);
    return null;
  }

  private toEvent(data: GoldPriceData): PriceFetchedEvent {
    return {
      asset: data.metal,
      price: data.price,
      currency: data.currency,
      provider: data.provider,
      timestamp: data.timestamp.toISOString(),
      buyPrice: data.buyPrice,
      sellPrice: data.sellPrice,
      high: data.high,
      low: data.low,
      open: data.open,
    };
  }
}
