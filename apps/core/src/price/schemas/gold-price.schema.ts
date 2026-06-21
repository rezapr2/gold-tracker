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

  // No single-field index here: metal is always queried together with a time
  // range and is served by the { metal: 1, timestamp: -1 } compound below.
  @Prop({ default: 'XAU' })
  metal: string;

  @Prop({ required: true })
  provider: string;

  @Prop({ type: Number })
  changePercent: number;

  @Prop({ type: Number })
  changeAmount: number;

  // Indexed via the explicit { timestamp: -1 } index below (a single-field
  // index serves both sort directions), so no prop-level index is needed.
  @Prop({ required: true })
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
// A TTL index ('ttl_raw') auto-expires raw points after the retention window.
// It is intentionally NOT declared here: its expireAfterSeconds tracks the
// admin-configurable retention, so it's created/updated at runtime by
// GoldPriceService.ensureRetentionIndex instead of statically.
