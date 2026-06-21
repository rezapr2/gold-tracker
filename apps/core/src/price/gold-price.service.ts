import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GoldPrice, GoldPriceDocument } from './schemas/gold-price.schema';
import { Metal, DEFAULT_METAL, getAsset, RedisService } from '@gold-tracker/shared';
import { startOfHour, startOfDay, subHours, subDays, subMinutes } from 'date-fns';

// Name of the TTL index that expires raw price points; managed at runtime by
// ensureRetentionIndex so its window can follow the admin-configured retention.
const RETENTION_INDEX = 'ttl_raw';

/** A normalised price observation handed to {@link GoldPriceService.ingestPrice}. */
export interface IngestPrice {
  price: number;
  currency: string;
  metal: string;
  provider: string;
  timestamp: Date;
  buyPrice?: number;
  sellPrice?: number;
  high?: number;
  low?: number;
  open?: number;
  changePercent?: number;
  changeAmount?: number;
}

/**
 * Owns all reads and writes of the price collection. In the microservices split
 * this service no longer talks to providers — fetchers do that and publish a
 * `price.fetched` event; {@link ingestPrice} is the write path that consumes it.
 */
@Injectable()
export class GoldPriceService {
  private readonly logger = new Logger(GoldPriceService.name);

  constructor(
    @InjectModel(GoldPrice.name) private goldPriceModel: Model<GoldPriceDocument>,
    @Optional() private readonly redis?: RedisService,
  ) {}

  /**
   * Persists a freshly-fetched price: dedups identical back-to-back values,
   * derives the change baseline from the last stored price (so it survives
   * restarts and stays correct across instances), and busts stale caches.
   * Returns the saved record, or null if it was a duplicate.
   */
  async ingestPrice(data: IngestPrice): Promise<GoldPrice | null> {
    const metal = data.metal || DEFAULT_METAL;

    if (await this.isDuplicate(data.price, data.timestamp, metal)) {
      this.logger.debug(`Duplicate ${metal} price detected, skipping save`);
      return null;
    }

    const previous = await this.getLatestPrice(metal);
    const changePercent = previous?.price
      ? ((data.price - previous.price) / previous.price) * 100
      : 0;
    const changeAmount = previous?.price ? data.price - previous.price : 0;

    const saved = await this.goldPriceModel.create({
      ...data,
      metal,
      changePercent: data.changePercent ?? changePercent,
      changeAmount: data.changeAmount ?? changeAmount,
    });

    await this.redis?.del(`stats:${metal}`, 'ratio');
    this.logger.log(`Price saved: ${metal} ${data.price} (${data.provider})`);
    return saved;
  }

  private async isDuplicate(price: number, timestamp: Date, metal: Metal): Promise<boolean> {
    const twoMinutesAgo = subMinutes(timestamp, 2);
    const existing = await this.goldPriceModel.findOne({
      metal,
      price,
      timestamp: { $gte: twoMinutesAgo },
      isHourlyAggregate: false,
      isDailyAggregate: false,
    });
    return !!existing;
  }

  async getLatestPrice(metal: Metal = DEFAULT_METAL): Promise<GoldPrice | null> {
    return this.goldPriceModel
      .findOne({ metal, isHourlyAggregate: false, isDailyAggregate: false })
      .sort({ timestamp: -1 })
      .lean()
      .exec();
  }

  async getPriceHistory(hours = 24, limit = 500, metal: Metal = DEFAULT_METAL): Promise<GoldPrice[]> {
    const since = subHours(new Date(), hours);
    return this.goldPriceModel
      .find({ metal, timestamp: { $gte: since }, isHourlyAggregate: false, isDailyAggregate: false })
      .sort({ timestamp: 1 })
      .limit(limit)
      .lean()
      .exec();
  }

  async getHourlyHistory(days = 7, metal: Metal = DEFAULT_METAL): Promise<GoldPrice[]> {
    const since = subDays(new Date(), days);
    return this.goldPriceModel
      .find({ metal, timestamp: { $gte: since }, isHourlyAggregate: true })
      .sort({ timestamp: 1 })
      .lean()
      .exec();
  }

  async getDailyHistory(months = 1, metal: Metal = DEFAULT_METAL): Promise<GoldPrice[]> {
    const since = subDays(new Date(), months * 30);
    return this.goldPriceModel
      .find({ metal, timestamp: { $gte: since }, isDailyAggregate: true })
      .sort({ timestamp: 1 })
      .lean()
      .exec();
  }

  async getCandlestickData(
    timeframe: '1h' | '4h' | '1d' | '7d' | '30d',
    metal: Metal = DEFAULT_METAL,
  ): Promise<any[]> {
    const { since, groupBy } = this.getTimeframeConfig(timeframe);

    const result = await this.goldPriceModel.aggregate([
      { $match: { metal, timestamp: { $gte: since }, isHourlyAggregate: false, isDailyAggregate: false } },
      {
        $group: {
          _id: { $dateTrunc: { date: '$timestamp', unit: groupBy } },
          open: { $first: '$price' },
          close: { $last: '$price' },
          high: { $max: '$price' },
          low: { $min: '$price' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return result.map((item) => ({
      time: Math.floor(new Date(item._id).getTime() / 1000),
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
    }));
  }

  private getTimeframeConfig(timeframe: string): { since: Date; groupBy: string } {
    const now = new Date();
    switch (timeframe) {
      case '1h': return { since: subHours(now, 1), groupBy: 'minute' };
      case '4h': return { since: subHours(now, 4), groupBy: 'minute' };
      case '1d': return { since: subHours(now, 24), groupBy: 'hour' };
      case '7d': return { since: subDays(now, 7), groupBy: 'hour' };
      case '30d': return { since: subDays(now, 30), groupBy: 'day' };
      default: return { since: subHours(now, 24), groupBy: 'hour' };
    }
  }

  async buildHourlyAggregates(metal: Metal = DEFAULT_METAL): Promise<void> {
    const hourStart = startOfHour(subHours(new Date(), 1));
    const hourEnd = startOfHour(new Date());

    const existing = await this.goldPriceModel.findOne({ metal, timestamp: hourStart, isHourlyAggregate: true });
    if (existing) return;

    const prices = await this.goldPriceModel.find({
      metal, timestamp: { $gte: hourStart, $lt: hourEnd }, isHourlyAggregate: false, isDailyAggregate: false,
    });
    if (prices.length === 0) return;

    const priceValues = prices.map((p) => p.price);
    const avgPrice = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;
    const firstPrice = prices[0].price;
    const lastPrice = prices[prices.length - 1].price;

    await this.goldPriceModel.create({
      price: avgPrice,
      high: Math.max(...priceValues),
      low: Math.min(...priceValues),
      open: firstPrice,
      currency: getAsset(metal).quoteCurrency,
      metal,
      provider: 'aggregate',
      timestamp: hourStart,
      changePercent: ((lastPrice - firstPrice) / firstPrice) * 100,
      changeAmount: lastPrice - firstPrice,
      isHourlyAggregate: true,
    });
    this.logger.log(`Hourly aggregate created for ${metal} ${hourStart.toISOString()}`);
  }

  async buildDailyAggregates(metal: Metal = DEFAULT_METAL): Promise<void> {
    const dayStart = startOfDay(subDays(new Date(), 1));
    const dayEnd = startOfDay(new Date());

    const existing = await this.goldPriceModel.findOne({ metal, timestamp: dayStart, isDailyAggregate: true });
    if (existing) return;

    const prices = await this.goldPriceModel.find({
      metal, timestamp: { $gte: dayStart, $lt: dayEnd }, isHourlyAggregate: false, isDailyAggregate: false,
    });
    if (prices.length === 0) return;

    const priceValues = prices.map((p) => p.price);
    const avgPrice = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;
    const firstPrice = prices[0].price;
    const lastPrice = prices[prices.length - 1].price;

    await this.goldPriceModel.create({
      price: avgPrice,
      high: Math.max(...priceValues),
      low: Math.min(...priceValues),
      open: firstPrice,
      currency: getAsset(metal).quoteCurrency,
      metal,
      provider: 'aggregate',
      timestamp: dayStart,
      changePercent: ((lastPrice - firstPrice) / firstPrice) * 100,
      changeAmount: lastPrice - firstPrice,
      isDailyAggregate: true,
    });
    this.logger.log(`Daily aggregate created for ${metal} ${dayStart.toISOString()}`);
  }

  async cleanOldData(retentionDays = 90): Promise<void> {
    const cutoff = subDays(new Date(), retentionDays);
    const result = await this.goldPriceModel.deleteMany({
      timestamp: { $lt: cutoff }, isHourlyAggregate: false, isDailyAggregate: false,
    });
    this.logger.log(`Cleaned ${result.deletedCount} old price records`);
  }

  /**
   * Ensures a MongoDB TTL index that auto-expires raw points after the retention
   * window, tracking the admin-configured retention via collMod. Aggregates are
   * preserved via a partial filter.
   */
  async ensureRetentionIndex(retentionDays: number): Promise<void> {
    const expireAfterSeconds = Math.max(1, Math.floor(retentionDays)) * 86400;
    const coll = this.goldPriceModel.collection;

    try {
      let existing: { expireAfterSeconds?: number } | undefined;
      try {
        const indexes = await coll.indexes();
        existing = indexes.find((i: any) => i.name === RETENTION_INDEX);
      } catch {
        existing = undefined;
      }

      if (!existing) {
        await coll.createIndex(
          { timestamp: 1 },
          {
            name: RETENTION_INDEX,
            expireAfterSeconds,
            partialFilterExpression: { isHourlyAggregate: false, isDailyAggregate: false },
          },
        );
        this.logger.log(`TTL retention index created: raw prices expire after ${retentionDays}d`);
      } else if (existing.expireAfterSeconds !== expireAfterSeconds) {
        await this.goldPriceModel.db.db.command({
          collMod: coll.collectionName,
          index: { name: RETENTION_INDEX, expireAfterSeconds },
        });
        this.logger.log(`TTL retention updated to ${retentionDays}d`);
      }
    } catch (error) {
      this.logger.warn(`Could not ensure TTL retention index: ${error.message}`);
    }
  }

  async getPriceStats(metal: Metal = DEFAULT_METAL): Promise<any> {
    const cacheKey = `stats:${metal}`;
    const cached = await this.redis?.getJson<any>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const dayAgo = subHours(now, 24);
    const weekAgo = subDays(now, 7);
    const baseMatch = { metal, isHourlyAggregate: false, isDailyAggregate: false };

    const periodGroup = {
      _id: null,
      high: { $max: '$price' },
      low: { $min: '$price' },
      open: { $first: '$price' },
    };

    const [latest, agg] = await Promise.all([
      this.getLatestPrice(metal),
      this.goldPriceModel.aggregate([
        { $match: { ...baseMatch, timestamp: { $gte: weekAgo } } },
        { $sort: { timestamp: 1 } },
        {
          $facet: {
            day: [{ $match: { timestamp: { $gte: dayAgo } } }, { $group: periodGroup }],
            week: [{ $group: periodGroup }],
          },
        },
      ]),
    ]);

    const day = agg[0]?.day[0];
    const week = agg[0]?.week[0];
    if (!latest || !day) return null;

    const periodStats = (period: { high: number; low: number; open: number }) => ({
      high: period.high,
      low: period.low,
      open: period.open,
      changePercent: period.open ? ((latest.price - period.open) / period.open) * 100 : 0,
      changeAmount: latest.price - period.open,
    });

    const result = {
      metal,
      current: latest.price,
      currency: getAsset(metal).quoteCurrency,
      timestamp: latest.timestamp,
      day: periodStats(day),
      week: week ? periodStats(week) : null,
    };

    await this.redis?.setJson(cacheKey, result, 15);
    return result;
  }

  async getGoldSilverRatio(): Promise<{ ratio: number; gold: number; silver: number; timestamp: Date } | null> {
    const cached = await this.redis?.getJson<any>('ratio');
    if (cached) return cached;

    const [gold, silver] = await Promise.all([this.getLatestPrice('XAU'), this.getLatestPrice('XAG')]);
    if (!gold?.price || !silver?.price) return null;

    const newest = new Date(gold.timestamp) > new Date(silver.timestamp) ? gold.timestamp : silver.timestamp;
    const result = { ratio: gold.price / silver.price, gold: gold.price, silver: silver.price, timestamp: newest };

    await this.redis?.setJson('ratio', result, 15);
    return result;
  }

  async getRecords(metal: Metal = DEFAULT_METAL): Promise<{
    metal: Metal; high: number; low: number; current: number;
    fromHighPercent: number; fromLowPercent: number; since: Date | null; days: number;
  } | null> {
    const current = await this.getLatestPrice(metal);
    if (!current?.price) return null;

    const [daily] = await this.goldPriceModel.aggregate([
      { $match: { metal, isDailyAggregate: true } },
      {
        $group: {
          _id: null,
          high: { $max: { $ifNull: ['$high', '$price'] } },
          low: { $min: { $ifNull: ['$low', '$price'] } },
          since: { $min: '$timestamp' },
          days: { $sum: 1 },
        },
      },
    ]);

    let high = daily?.high;
    let low = daily?.low;
    let since = daily?.since ?? null;
    let days = daily?.days ?? 0;

    if (!daily) {
      const [raw] = await this.goldPriceModel.aggregate([
        { $match: { metal, isHourlyAggregate: false, isDailyAggregate: false } },
        { $group: { _id: null, high: { $max: '$price' }, low: { $min: '$price' }, since: { $min: '$timestamp' } } },
      ]);
      if (!raw) return null;
      high = raw.high; low = raw.low; since = raw.since; days = 0;
    }

    return {
      metal, high, low, current: current.price,
      fromHighPercent: high ? ((current.price - high) / high) * 100 : 0,
      fromLowPercent: low ? ((current.price - low) / low) * 100 : 0,
      since, days,
    };
  }

  async exportHistoryCsv(hours = 720, metal: Metal = DEFAULT_METAL): Promise<string> {
    const rows = await this.getPriceHistory(hours, 50000, metal);
    const header = 'timestamp,metal,price,open,high,low,changePercent,provider';
    const lines = rows.map((r) =>
      [
        new Date(r.timestamp).toISOString(),
        r.metal, r.price, r.open ?? '', r.high ?? '', r.low ?? '', r.changePercent ?? '', r.provider,
      ].join(','),
    );
    return [header, ...lines].join('\n');
  }
}
