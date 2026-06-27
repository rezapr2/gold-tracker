import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, RmqContext } from '@nestjs/microservices';
import { RoutingKey } from '@gold-tracker/shared';
import { SettingsStoreService } from '../settings/settings-store.service';
import { FetchService } from './fetch.service';

/** Reacts to `settings.changed` so the fetch interval / API keys hot-reload. */
@Controller()
export class FetchEventsController {
  constructor(
    private readonly settings: SettingsStoreService,
    private readonly fetch: FetchService,
  ) {}

  @EventPattern(RoutingKey.SettingsChanged)
  async onSettingsChanged(@Ctx() ctx: RmqContext): Promise<void> {
    const channel = ctx.getChannelRef();
    const message = ctx.getMessage();
    try {
      this.settings.invalidate();
      await this.fetch.applyInterval();
    } finally {
      channel.ack(message);
    }
  }
}
