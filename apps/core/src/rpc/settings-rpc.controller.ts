import { Controller, Inject } from '@nestjs/common';
import { ClientProxy, MessagePattern, Payload } from '@nestjs/microservices';
import { EVENTS_CLIENT, Rpc, RoutingKey, BotSettingsData, SettingsChangedEvent } from '@gold-tracker/shared';
import { SettingsService } from '../settings/settings.service';

/**
 * Settings read/write RPC. On update core persists then broadcasts
 * `settings.changed` so fetchers / telegram-bot / web-api re-pull and
 * re-schedule without a restart (the cross-service version of the monolith's
 * in-process applySchedule()).
 */
@Controller()
export class SettingsRpcController {
  constructor(
    private readonly settings: SettingsService,
    @Inject(EVENTS_CLIENT) private readonly events: ClientProxy,
  ) {}

  @MessagePattern(Rpc.SettingsGet)
  get(): Promise<BotSettingsData> {
    return this.settings.getRaw();
  }

  @MessagePattern(Rpc.SettingsUpdate)
  async update(@Payload() patch: Partial<BotSettingsData>): Promise<BotSettingsData> {
    const doc = await this.settings.update(patch);
    const event: SettingsChangedEvent = { at: new Date().toISOString() };
    this.events.emit(RoutingKey.SettingsChanged, event);
    return doc;
  }
}
