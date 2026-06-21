import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PriceStatisticsDocument = PriceStatistics & Document;

export enum StatsPeriod {
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

@Schema({ timestamps: true, collection: 'price_statistics' })
export class PriceStatistics {
  @Prop({ required: true, default: 'XAU', index: true })
  metal: string;

  @Prop({ required: true, enum: StatsPeriod })
  period: StatsPeriod;

  @Prop({ required: true })
  periodStart: Date;

  @Prop({ required: true })
  periodEnd: Date;

  @Prop({ required: true, type: Number })
  openPrice: number;

  @Prop({ required: true, type: Number })
  closePrice: number;

  @Prop({ required: true, type: Number })
  highPrice: number;

  @Prop({ required: true, type: Number })
  lowPrice: number;

  @Prop({ required: true, type: Number })
  averagePrice: number;

  @Prop({ type: Number })
  changePercent: number;

  @Prop({ type: Number })
  changeAmount: number;

  @Prop({ type: Number })
  volatility: number;

  @Prop({ type: Number })
  volume: number;

  @Prop({ type: Number })
  dataPoints: number;

  @Prop({ type: [Number] })
  movingAverage7: number[];

  @Prop({ type: [Number] })
  movingAverage30: number[];
}

export const PriceStatisticsSchema = SchemaFactory.createForClass(PriceStatistics);

PriceStatisticsSchema.index({ metal: 1, period: 1, periodStart: -1 });
PriceStatisticsSchema.index({ periodStart: -1 });
