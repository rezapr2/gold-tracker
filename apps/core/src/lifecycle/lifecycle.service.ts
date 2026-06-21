import { Injectable, Logger, OnApplicationBootstrap, Optional } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { METALS, RedisService } from '@gold-tracker/shared';
import { GoldPriceService } from '../price/gold-price.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { SettingsService } from '../settings/settings.service';

/**
 * Data-lifecycle crons that used to live in the monolith's scheduler: hourly /
 * daily aggregates, analytics rollups, retention cleanup, and keeping the TTL
 * retention index in sync. Each job is guarded by a cross-instance Redis lock so
 * it runs once across all core replicas.
 */
@Injectable()
export class LifecycleService implements OnApplicationBootstrap {
  private readonly logger = new Logger(LifecycleService.name);

  constructor(
    private readonly price: GoldPriceService,
    private readonly analytics: AnalyticsService,
    private readonly settings: SettingsService,
    @Optional() private readonly redis?: RedisService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.price.ensureRetentionIndex(await this.settings.dataRetentionDays());
  }

  private async exclusive(name: string, ttlMs: number, fn: () => Promise<void>): Promise<void> {
    if (!this.redis) return fn();
    const ran = await this.redis.runExclusive(`cron-lock:${name}`, ttlMs, fn);
    if (!ran) this.logger.debug(`Cron '${name}' skipped — another instance holds the lock`);
  }

  @Cron('5 * * * *', { name: 'buildHourlyAggregates' })
  async buildHourlyAggregates() {
    await this.exclusive('buildHourlyAggregates', 60_000, async () => {
      for (const metal of METALS) {
        try {
          await this.price.buildHourlyAggregates(metal);
        } catch (error: any) {
          this.logger.error(`Hourly aggregate cron failed for ${metal}: ${error.message}`);
        }
      }
    });
  }

  @Cron('10 1 * * *', { name: 'buildDailyAggregates' })
  async buildDailyAggregates() {
    await this.exclusive('buildDailyAggregates', 300_000, async () => {
      for (const metal of METALS) {
        try {
          await this.price.buildDailyAggregates(metal);
          await this.analytics.computeAndSaveDailyStats(new Date(), metal);
          await this.analytics.computeAndSaveWeeklyStats(new Date(), metal);
          await this.analytics.computeAndSaveMonthlyStats(new Date(), metal);
        } catch (error: any) {
          this.logger.error(`Daily aggregate cron failed for ${metal}: ${error.message}`);
        }
      }
    });
  }

  // Backstop only: retention is primarily enforced by the TTL index. This daily
  // sweep covers the case where that index is missing (restricted DB user).
  @Cron('0 3 * * *', { name: 'cleanOldData' })
  async cleanOldData() {
    await this.exclusive('cleanOldData', 120_000, async () => {
      try {
        const retentionDays = await this.settings.dataRetentionDays();
        await this.price.ensureRetentionIndex(retentionDays);
        await this.price.cleanOldData(retentionDays);
      } catch (error: any) {
        this.logger.error(`Data cleanup cron failed: ${error.message}`);
      }
    });
  }
}
