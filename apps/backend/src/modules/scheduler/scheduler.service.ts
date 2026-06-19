import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { CronTime } from 'cron';
import { GoldPriceService } from '../gold-price/gold-price.service';
import { TelegramService } from '../telegram/telegram.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { RedisService } from '../redis/redis.service';
import { SettingsStoreService } from '../settings/settings-store.service';
import { Metal, METALS } from '../gold-price/metal.types';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);
  // Fallback when Redis isn't available (single-instance / dev).
  private readonly localAlertPrice = new Map<Metal, number>();

  constructor(
    private goldPriceService: GoldPriceService,
    private telegramService: TelegramService,
    private analyticsService: AnalyticsService,
    private websocketGateway: WebsocketGateway,
    private settings: SettingsStoreService,
    private schedulerRegistry: SchedulerRegistry,
    @Optional() private readonly redis?: RedisService,
  ) {}

  async onModuleInit() {
    await this.applySchedule();
  }

  /**
   * Applies admin-configured cron intervals to the running jobs so a saved
   * change takes effect without a restart. Called on boot and after each save.
   */
  async applySchedule(): Promise<void> {
    this.reschedule('fetchGoldPrice', await this.settings.priceFetchInterval());
  }

  private reschedule(name: string, cronExpr: string): void {
    if (!cronExpr) return;
    try {
      const job = this.schedulerRegistry.getCronJob(name);
      job.stop();
      job.setTime(new CronTime(cronExpr));
      job.start();
      this.logger.log(`Cron '${name}' scheduled at '${cronExpr}'`);
    } catch (error) {
      this.logger.warn(`Failed to reschedule cron '${name}': ${error.message}`);
    }
  }

  @Cron('*/1 * * * *', { name: 'fetchGoldPrice' })
  async fetchGoldPrice() {
    for (const metal of METALS) {
      try {
        const price = await this.goldPriceService.fetchAndSavePrice(metal);
        if (price) {
          this.websocketGateway.emitPriceUpdate(price);
          await this.checkPriceAlert(metal, price.price);
        }
      } catch (error) {
        this.logger.error(`Price fetch cron failed for ${metal}: ${error.message}`);
      }
    }
  }

  @Cron('5 * * * *', { name: 'buildHourlyAggregates' })
  async buildHourlyAggregates() {
    for (const metal of METALS) {
      try {
        await this.goldPriceService.buildHourlyAggregates(metal);
      } catch (error) {
        this.logger.error(`Hourly aggregate cron failed for ${metal}: ${error.message}`);
      }
    }
  }

  @Cron('10 1 * * *', { name: 'buildDailyAggregates' })
  async buildDailyAggregates() {
    for (const metal of METALS) {
      try {
        await this.goldPriceService.buildDailyAggregates(metal);
        await this.analyticsService.computeAndSaveDailyStats(new Date(), metal);
        await this.analyticsService.computeAndSaveWeeklyStats(new Date(), metal);
        await this.analyticsService.computeAndSaveMonthlyStats(new Date(), metal);
      } catch (error) {
        this.logger.error(`Daily aggregate cron failed for ${metal}: ${error.message}`);
      }
    }
  }

  @Cron('0 */2 * * *', { name: 'telegramScheduledUpdate' })
  async sendScheduledTelegramUpdate() {
    for (const metal of METALS) {
      if (!this.telegramService.isReady(metal)) continue;
      try {
        await this.telegramService.sendPriceUpdate(metal);
      } catch (error) {
        this.logger.error(`Scheduled Telegram update failed for ${metal}: ${error.message}`);
      }
    }
  }

  @Cron('0 20 * * *', { name: 'telegramDailySummary' })
  async sendDailySummary() {
    for (const metal of METALS) {
      if (!this.telegramService.isReady(metal)) continue;
      try {
        await this.telegramService.sendDailySummary(metal);
      } catch (error) {
        this.logger.error(`Daily summary cron failed for ${metal}: ${error.message}`);
      }
    }
  }

  @Cron('0 3 * * *', { name: 'cleanOldData' })
  async cleanOldData() {
    try {
      const retentionDays = await this.settings.dataRetentionDays();
      await this.goldPriceService.cleanOldData(retentionDays);
    } catch (error) {
      this.logger.error(`Data cleanup cron failed: ${error.message}`);
    }
  }

  private async checkPriceAlert(metal: Metal, currentPrice: number) {
    const baseline = await this.getAlertBaseline(metal);
    if (!this.telegramService.isReady(metal) || baseline === null) {
      await this.setAlertBaseline(metal, currentPrice);
      return;
    }

    const threshold = await this.settings.alertThreshold();
    const changePercent = ((currentPrice - baseline) / baseline) * 100;

    if (Math.abs(changePercent) >= threshold) {
      await this.telegramService.sendAlert(metal, currentPrice, changePercent);
      await this.setAlertBaseline(metal, currentPrice);
      this.logger.log(`Alert sent for ${metal}: ${changePercent.toFixed(2)}% change`);
    }
  }

  // Alert baseline is shared via Redis when available so it survives restarts
  // and stays consistent across instances; otherwise it's process-local.
  private async getAlertBaseline(metal: Metal): Promise<number | null> {
    if (this.redis?.isAvailable()) {
      const v = await this.redis.get(`alert:last:${metal}`);
      return v !== null ? Number(v) : null;
    }
    return this.localAlertPrice.get(metal) ?? null;
  }

  private async setAlertBaseline(metal: Metal, price: number): Promise<void> {
    if (this.redis?.isAvailable()) {
      await this.redis.set(`alert:last:${metal}`, String(price));
    } else {
      this.localAlertPrice.set(metal, price);
    }
  }
}
