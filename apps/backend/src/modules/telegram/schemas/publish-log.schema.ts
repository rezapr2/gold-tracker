import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PublishLogDocument = PublishLog & Document;

export enum PublishType {
  SCHEDULED = 'scheduled',
  MANUAL = 'manual',
  ALERT = 'alert',
  DAILY_SUMMARY = 'daily_summary',
}

export enum PublishStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  PENDING = 'pending',
}

@Schema({ timestamps: true, collection: 'publish_logs' })
export class PublishLog {
  @Prop({ default: 'XAU', index: true })
  metal: string;

  @Prop({ required: true, enum: PublishType })
  type: PublishType;

  @Prop({ required: true, enum: PublishStatus, default: PublishStatus.PENDING })
  status: PublishStatus;

  @Prop({ required: true })
  channelId: string;

  @Prop({ type: String })
  messageId: string;

  @Prop({ type: String })
  messageText: string;

  @Prop({ type: Number })
  goldPrice: number;

  @Prop({ type: Number })
  changePercent: number;

  @Prop({ type: String })
  errorMessage: string;

  @Prop({ type: Number })
  retryCount: number;

  createdAt: Date;
  updatedAt: Date;
}

export const PublishLogSchema = SchemaFactory.createForClass(PublishLog);

PublishLogSchema.index({ createdAt: -1 });
PublishLogSchema.index({ type: 1, status: 1 });
