import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { Rpc, toAsset } from '@gold-tracker/shared';
import { TelegramService } from './telegram.service';
import { TelegramChannelService } from './telegram-channel.service';
import { PublishType } from './schemas/publish-log.schema';
import { TEMPLATE_PLACEHOLDERS } from './message-template';

/**
 * Admin telegram operations, answered over RPC and proxied by web-api. Mirrors
 * the routes the monolith's TelegramController exposed, so the admin UI is
 * unchanged.
 */
@Controller()
export class TelegramRpcController {
  constructor(
    private readonly telegram: TelegramService,
    private readonly channels: TelegramChannelService,
  ) {}

  @MessagePattern(Rpc.TelegramStatus)
  status() {
    return this.telegram.getBotStatus();
  }

  @MessagePattern(Rpc.TelegramLogs)
  logs(@Payload() p: { limit?: number; metal?: string }) {
    return this.telegram.getPublishLogs(+(p?.limit ?? 20), p?.metal ? toAsset(p.metal) : undefined);
  }

  @MessagePattern(Rpc.TelegramSend)
  send(@Payload() p: { metal?: string; channelId?: string }) {
    return this.telegram.sendPriceUpdate(toAsset(p?.metal), p?.channelId, PublishType.MANUAL);
  }

  @MessagePattern(Rpc.TelegramSendSummary)
  sendSummary(@Payload() p: { metal?: string; channelId?: string }) {
    return this.telegram.sendDailySummary(toAsset(p?.metal), p?.channelId);
  }

  @MessagePattern(Rpc.TelegramChannelsList)
  async channelsList(@Payload() p: { metal?: string }) {
    const channels = await this.channels.list(p?.metal ? toAsset(p.metal) : undefined);
    return { channels, placeholders: TEMPLATE_PLACEHOLDERS };
  }

  @MessagePattern(Rpc.TelegramChannelUpsert)
  channelUpsert(@Payload() body: any) {
    return this.channels.upsert({ ...body, metal: toAsset(body?.metal) });
  }

  @MessagePattern(Rpc.TelegramChannelDelete)
  channelDelete(@Payload() p: { id: string }) {
    return this.channels.remove(p.id);
  }
}
