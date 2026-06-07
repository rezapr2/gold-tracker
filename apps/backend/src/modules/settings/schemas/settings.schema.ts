import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BotSettingsDocument = BotSettings & Document;

@Schema({ timestamps: true, collection: 'bot_settings' })
export class BotSettings {
  @Prop({ required: true, unique: true, default: 'default' })
  key: string;

  @Prop({ type: String })
  telegramBotToken: string;

  @Prop({ type: String })
  telegramChannelId: string;

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
