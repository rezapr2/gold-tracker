import { Injectable, Logger, OnApplicationBootstrap, Optional } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { METALS, RedisService, HeartbeatService } from '@gold-tracker/shared';
import { TelegramService } from '../telegram/telegram.service';

/**
 * Time-driven Telegram publishing (scheduled updates + daily summary), moved out
 * of the monolith's scheduler. Each job RPCs core for stats (inside
 * TelegramService) then broadcasts; a cross-instance Redis lock keeps one bot
 * replica publishing per tick. Also feeds the bot status into the heartbeat.
 */
@Injectable()
export class SchedulerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly telegram: TelegramService,
    private readonly heartbeat: HeartbeatService,
    @Optional() private readonly redis?: RedisService,
  ) {}

  onApplicationBootstrap(): void {
    this.heartbeat.setDetailProvider(() => this.telegram.getBotStatus());
  }

  private async exclusive(name: string, ttlMs: number, fn: () => Promise<void>): Promise<void> {
    if (!this.redis) return fn();
    const ran = await this.redis.runExclusive(`cron-lock:${name}`, ttlMs, fn);
    if (!ran) this.logger.debug(`Cron '${name}' skipped — another instance holds the lock`);
  }

  @Cron('0 */2 * * *', { name: 'telegramScheduledUpdate' })
  async scheduledUpdate(): Promise<void> {
    await this.exclusive('telegramScheduledUpdate', 60_000, async () => {
      for (const metal of METALS) {
        if (!this.telegram.isReady(metal)) continue;
        try {
          await this.telegram.sendPriceUpdate(metal);
        } catch (error: any) {
          this.logger.error(`Scheduled Telegram update failed for ${metal}: ${error.message}`);
        }
      }
    });
  }

  @Cron('0 20 * * *', { name: 'telegramDailySummary' })
  async dailySummary(): Promise<void> {
    await this.exclusive('telegramDailySummary', 60_000, async () => {
      for (const metal of METALS) {
        if (!this.telegram.isReady(metal)) continue;
        try {
          await this.telegram.sendDailySummary(metal);
        } catch (error: any) {
          this.logger.error(`Daily summary cron failed for ${metal}: ${error.message}`);
        }
      }
    });
  }
}
