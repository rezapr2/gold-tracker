import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GoldPriceDocument = GoldPrice & Document;

@Schema({ timestamps: true, collection: 'gold_prices' })
export class GoldPrice {
  @Prop({ required: true, type: Number })
  price: number;

  @Prop({ type: Number })
  buyPrice: number;

  @Prop({ type: Number })
  sellPrice: number;

  @Prop({ type: Number })
  high: number;

  @Prop({ type: Number })
  low: number;

  @Prop({ type: Number })
  open: number;

  @Prop({ default: 'USD' })
  currency: string;

  @Prop({ default: 'XAU', index: true })
  metal: string;

  @Prop({ required: true })
  provider: string;

  @Prop({ type: Number })
  changePercent: number;

  @Prop({ type: Number })
  changeAmount: number;

  @Prop({ required: true, index: true })
  timestamp: Date;

  @Prop({ default: false })
  isHourlyAggregate: boolean;

  @Prop({ default: false })
  isDailyAggregate: boolean;
}

export const GoldPriceSchema = SchemaFactory.createForClass(GoldPrice);

GoldPriceSchema.index({ timestamp: -1 });
GoldPriceSchema.index({ timestamp: -1, provider: 1 });
// Metal-scoped queries are the common path now that XAU and XAG share a collection.
GoldPriceSchema.index({ metal: 1, timestamp: -1 });
GoldPriceSchema.index({ metal: 1, isHourlyAggregate: 1, timestamp: -1 });
GoldPriceSchema.index({ metal: 1, isDailyAggregate: 1, timestamp: -1 });
