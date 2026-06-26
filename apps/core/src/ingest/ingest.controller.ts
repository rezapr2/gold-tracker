import { Controller, Inject, Logger, Optional } from '@nestjs/common';
import { ClientProxy, Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import {
  EVENTS_CLIENT,
  RoutingKey,
  PriceFetchedEvent,
  PriceSavedEvent,
  PriceAlertEvent,
  RedisService,
} from '@gold-tracker/shared';
import { GoldPriceService } from '../price/gold-price.service';
import { SettingsService } from '../settings/settings.service';

/**
 * The write path. Consumes `price.fetched` from the fetchers, persists via
 * GoldPriceService (dedup + change computation), then re-emits `price.saved`
 * (drives WS + Telegram) and, when a move crosses the alert threshold,
 * `price.alert`. Manual ack so a failed save dead-letters rather than vanishes.
 */
@Controller()
export class IngestController {
  private readonly logger = new Logger(IngestController.name);
  // Local fallback for the alert baseline when Redis is unavailable.
  private readonly localBaseline = new Map<string, number>();

  constructor(
    private readonly price: GoldPriceService,
    private readonly settings: SettingsService,
    @Inject(EVENTS_CLIENT) private readonly events: ClientProxy,
    @Optional() private readonly redis?: RedisService,
  ) {}

  @EventPattern(RoutingKey.PriceFetched)
  async onPriceFetched(@Payload() evt: PriceFetchedEvent, @Ctx() ctx: RmqContext): Promise<void> {
    const channel = ctx.getChannelRef();
    const message = ctx.getMessage();
    try {
      // Defensive: a disabled asset must never be persisted, even if a fetcher
      // is mid-cycle when it's switched off. Ack so the message is consumed.
      if (!(await this.settings.isAssetEnabled(evt.asset))) {
        channel.ack(message);
        return;
      }
      const saved = await this.price.ingestPrice({
        price: evt.price,
        currency: evt.currency,
        metal: evt.asset,
        provider: evt.provider,
        timestamp: new Date(evt.timestamp),
        buyPrice: evt.buyPrice,
        sellPrice: evt.sellPrice,
        high: evt.high,
        low: evt.low,
        open: evt.open,
      });

      if (saved) {
        const payload: PriceSavedEvent = {
          price: saved.price,
          buyPrice: saved.buyPrice,
          sellPrice: saved.sellPrice,
          high: saved.high,
          low: saved.low,
          open: saved.open,
          currency: saved.currency,
          metal: saved.metal,
          provider: saved.provider,
          changePercent: saved.changePercent,
          changeAmount: saved.changeAmount,
          timestamp: saved.timestamp,
        };
        this.events.emit(RoutingKey.PriceSaved, payload);
        await this.checkAlert(evt.asset, saved.price);
      }
      channel.ack(message);
    } catch (error: any) {
      this.logger.error(`Failed to ingest ${evt.asset} price: ${error.message}`);
      // Don't requeue — dead-letter so a poison message can't loop forever.
      channel.nack(message, false, false);
    }
  }

  /** Emits `price.alert` when the move since the last baseline exceeds the threshold. */
  private async checkAlert(asset: string, price: number): Promise<void> {
    const baseline = await this.getBaseline(asset);
    if (baseline === null) {
      await this.setBaseline(asset, price);
      return;
    }
    const threshold = await this.settings.alertThreshold();
    const changePercent = ((price - baseline) / baseline) * 100;
    if (Math.abs(changePercent) >= threshold) {
      const alert: PriceAlertEvent = { asset, price, changePercent, baseline };
      this.events.emit(RoutingKey.PriceAlert, alert);
      await this.setBaseline(asset, price);
      this.logger.log(`Alert emitted for ${asset}: ${changePercent.toFixed(2)}%`);
    }
  }

  private async getBaseline(asset: string): Promise<number | null> {
    if (this.redis?.isAvailable()) {
      const v = await this.redis.get(`alert:last:${asset}`);
      return v !== null ? Number(v) : null;
    }
    return this.localBaseline.get(asset) ?? null;
  }

  private async setBaseline(asset: string, price: number): Promise<void> {
    if (this.redis?.isAvailable()) await this.redis.set(`alert:last:${asset}`, String(price));
    else this.localBaseline.set(asset, price);
  }
}
