import { Inject, Injectable, Logger, OnApplicationBootstrap, Optional } from '@nestjs/common';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { CronTime } from 'cron';
import { ClientProxy } from '@nestjs/microservices';
import {
  EVENTS_CLIENT,
  RoutingKey,
  PriceFetchedEvent,
  Asset,
  assetsForProvider,
  mapWithConcurrency,
  RedisService,
  HeartbeatService,
} from '@gold-tracker/shared';
import { GoldPriceData } from '../providers/price-provider.interface';
import { EstjtProvider } from '../providers/estjt.provider';
import { SettingsStoreService } from '../settings/settings-store.service';

const CRON_NAME = 'fetchEstjt';

/**
 * Scrapes the Tehran Gold Union page on a schedule and emits a `price.fetched`
 * event per IR_* asset. The provider memoises the parsed table, so all assets
 * in a cycle share one HTTP request.
 */
@Injectable()
export class FetchService implements OnApplicationBootstrap {
  private readonly logger = new Logger(FetchService.name);
  private readonly assets: Asset[] = assetsForProvider('estjt');
  private readonly lastFetch: Record<string, string> = {};

  constructor(
    private readonly provider: EstjtProvider,
    private readonly settings: SettingsStoreService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly heartbeat: HeartbeatService,
    @Inject(EVENTS_CLIENT) private readonly events: ClientProxy,
    @Optional() private readonly redis?: RedisService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    this.heartbeat.setDetailProvider(() => ({ assets: this.assets, lastFetch: this.lastFetch }));
    await this.applyInterval();
  }

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
    const run = async () => {
      await mapWithConcurrency(this.assets, 4, async (asset) => {
        try {
          const data = await this.provider.fetchPrice(asset);
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
      const ran = await this.redis.runExclusive('cron-lock:fetch-estjt', 50_000, run);
      if (!ran) this.logger.debug('fetch-estjt skipped — another replica holds the lock');
    } else {
      await run();
    }
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
