import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

/** Per-asset Telegram bot override, keyed by asset code (e.g. XAU, XAG). */
export interface TelegramBotOverride {
  token?: string;
  channelId?: string;
}

export type BotSettingsDocument = BotSettings & Document;

@Schema({ timestamps: true, collection: 'bot_settings' })
export class BotSettings {
  @Prop({ required: true, unique: true, default: 'default' })
  key: string;

  // Per-asset bot token + channel, keyed by asset code. Empty/missing entries
  // fall back to the asset's env vars (see asset registry `telegram`).
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  telegramBots: Record<string, TelegramBotOverride>;

  @Prop({ default: true })
  telegramSendCharts: boolean;

  @Prop({ default: false })
  telegramCommandsEnabled: boolean;

  @Prop({ default: '*/1 * * * *' })
  priceFetchInterval: string;

  @Prop({ default: '*/30 * * * *' })
  telegramPublishInterval: string;

  @Prop({ default: 1.5, type: Number })
  priceAlertThreshold: number;

  @Prop({ default: true })
  telegramEnabled: boolean;

  @Prop({ default: true })
  alertsEnabled: boolean;

  @Prop({ default: 'en', enum: ['en', 'fa'] })
  language: string;

  @Prop({ type: String })
  goldApiKey: string;

  @Prop({ type: String })
  metalsDevKey: string;

  @Prop({ type: String })
  twelveDataKey: string;

  @Prop({ type: String })
  alphaVantageKey: string;

  @Prop({ default: 90, type: Number })
  dataRetentionDays: number;
}

export const BotSettingsSchema = SchemaFactory.createForClass(BotSettings);
