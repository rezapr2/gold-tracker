import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { RoutingKey, PriceAlertEvent } from '@gold-tracker/shared';
import { TelegramService } from './telegram.service';
import { SettingsStoreService } from '../settings/settings-store.service';

/**
 * Event side of the bot: turns a core `price.alert` into a Telegram alert, and a
 * `settings.changed` into a token/chart re-init (the cross-service equivalent of
 * the old in-process settings reload).
 */
@Controller()
export class TelegramEventsController {
  private readonly logger = new Logger(TelegramEventsController.name);

  constructor(
    private readonly telegram: TelegramService,
    private readonly settings: SettingsStoreService,
  ) {}

  @EventPattern(RoutingKey.PriceAlert)
  async onAlert(@Payload() alert: PriceAlertEvent, @Ctx() ctx: RmqContext): Promise<void> {
    const channel = ctx.getChannelRef();
    const message = ctx.getMessage();
    try {
      if (this.telegram.isReady(alert.asset)) {
        await this.telegram.sendAlert(alert.asset, alert.price, alert.changePercent);
      }
    } catch (error: any) {
      this.logger.error(`Failed to send alert for ${alert.asset}: ${error.message}`);
    } finally {
      channel.ack(message);
    }
  }

  @EventPattern(RoutingKey.SettingsChanged)
  async onSettingsChanged(@Ctx() ctx: RmqContext): Promise<void> {
    const channel = ctx.getChannelRef();
    const message = ctx.getMessage();
    try {
      this.settings.invalidate();
      await this.telegram.reinitializeBots();
    } finally {
      channel.ack(message);
    }
  }
}
