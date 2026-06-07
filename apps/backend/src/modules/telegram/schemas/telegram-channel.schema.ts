import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TelegramChannelDocument = TelegramChannel & Document;

/**
 * A target Telegram channel. Multiple channels can exist per metal, each with
 * its own message pattern (template) — e.g. an English channel and a Persian
 * one, or a verbose vs. compact layout.
 */
@Schema({ timestamps: true, collection: 'telegram_channels' })
export class TelegramChannel {
  @Prop({ required: true })
  channelId: string;

  @Prop({ default: 'XAU', enum: ['XAU', 'XAG'], index: true })
  metal: string;

  /** Friendly label for the dashboard. */
  @Prop({ type: String })
  name: string;

  /**
   * Optional message pattern with {placeholders} (see message-template.ts).
   * When empty, the built-in default formatting is used.
   */
  @Prop({ type: String })
  template: string;

  @Prop({ default: 'en', enum: ['en', 'fa'] })
  language: string;

  @Prop({ default: true })
  enabled: boolean;

  /** Per-channel override for attaching the trend chart image. */
  @Prop({ type: Boolean })
  sendCharts: boolean;
}

export const TelegramChannelSchema = SchemaFactory.createForClass(TelegramChannel);

TelegramChannelSchema.index({ metal: 1, enabled: 1 });
TelegramChannelSchema.index({ channelId: 1, metal: 1 }, { unique: true });
