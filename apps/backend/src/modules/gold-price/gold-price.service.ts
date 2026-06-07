import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GoldPrice, GoldPriceDocument } from './schemas/gold-price.schema';
import { GoldApiProvider, GoldPriceData } from './providers/goldapi.provider';
import { MetalsDevProvider } from './providers/metals-dev.provider';
import { TwelveDataProvider } from './providers/twelve-data.provider';
import { AlphaVantageProvider } from './providers/alpha-vantage.provider';
import { RedisService } from '../redis/redis.service';
import { Metal, DEFAULT_METAL } from './metal.types';
import { startOfHour, startOfDay, subHours, subDays, subMinutes } from 'date-fns';

@Injectable()
export class GoldPriceService {
  private readonly logger = new Logger(GoldPriceService.name);

  constructor(
    @InjectModel(GoldPrice.name) private goldPriceModel: Model<GoldPriceDocument>,
    private goldApiProvider: GoldApiProvider,
    private metalsDevProvider: MetalsDevProvider,
    private twelveDataProvider: TwelveDataProvider,
    private alphaVantageProvider: AlphaVantageProvider,
    @Optional() private readonly redis?: RedisService,
  ) {}

  async fetchAndSavePrice(metal: Metal = DEFAULT_METAL): Promise<GoldPrice | null> {
    const providers = [
      this.goldApiProvider,
      this.metalsDevProvider,
      this.twelveDataProvider,
      this.alphaVantageProvider,
    ];

    let priceData: GoldPriceData | null = null;

    for (const provider of providers) {
      priceData = await provider.fetchPrice(metal);
      if (priceData) break;
    }

    if (!priceData) {
      this.logger.error(`All price providers failed for ${metal}`);
      return null;
    }

    if (await this.isDuplicate(priceData.price, priceData.timestamp, metal)) {
      this.logger.debug(`Duplicate ${metal} price detected, skipping save`);
      return null;
    }

    // Derive the change baseline from the last stored price so it survives
    // restarts and stays correct across multiple backend instances, instead of
    // relying on process-local memory.
    const previous = await this.getLatestPrice(metal);
    const changePercent = previous?.price
      ? ((priceData.price - previous.price) / previous.price) * 100
      : 0;
    const changeAmount = previous?.price ? priceData.price - previous.price : 0;

    const saved = await this.goldPriceModel.create({
      ...priceData,
      metal: priceData.metal || metal,
      changePercent: priceData.changePercent ?? changePercent,
      changeAmount: priceData.changeAmount ?? changeAmount,
    });

    // Bust caches that just went stale.
    await this.redis?.del(`stats:${metal}`, 'ratio');

    this.logger.log(`Price saved: ${metal} $${priceData.price} (${priceData.provider})`);

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

  async getPriceHistory(hours: number = 24, limit: number = 500, metal: Metal = DEFAULT_METAL): Promise<GoldPrice[]> {
    const since = subHours(new Date(), hours);
    return this.goldPriceModel
      .find({ metal, timestamp: { $gte: since }, isHourlyAggregate: false, isDailyAggregate: false })
      .sort({ timestamp: 1 })
      .limit(limit)
      .lean()
      .exec();
  }

  async getHourlyHistory(days: number = 7, metal: Metal = DEFAULT_METAL): Promise<GoldPrice[]> {
    const since = subDays(new Date(), days);
    return this.goldPriceModel
      .find({ metal, timestamp: { $gte: since }, isHourlyAggregate: true })
      .sort({ timestamp: 1 })
      .lean()
      .exec();
  }

  async getDailyHistory(months: number = 1, metal: Metal = DEFAULT_METAL): Promise<GoldPrice[]> {
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
      {
        $match: {
          metal,
          timestamp: { $gte: since },
          isHourlyAggregate: false,
          isDailyAggregate: false,
        },
      },
      {
        $group: {
          _id: {
            $dateTrunc: { date: '$timestamp', unit: groupBy },
          },
          open: { $first: '$price' },
          close: { $last: '$price' },
          high: { $max: '$price' },
          low: { $min: '$price' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id': 1 } },
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

    const existing = await this.goldPriceModel.findOne({
      metal,
      timestamp: hourStart,
      isHourlyAggregate: true,
    });

    if (existing) return;

    const prices = await this.goldPriceModel.find({
      metal,
      timestamp: { $gte: hourStart, $lt: hourEnd },
      isHourlyAggregate: false,
      isDailyAggregate: false,
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
      currency: 'USD',
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

    const existing = await this.goldPriceModel.findOne({
      metal,
      timestamp: dayStart,
      isDailyAggregate: true,
    });

    if (existing) return;

    const prices = await this.goldPriceModel.find({
      metal,
      timestamp: { $gte: dayStart, $lt: dayEnd },
      isHourlyAggregate: false,
      isDailyAggregate: false,
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
      currency: 'USD',
      metal,
      provider: 'aggregate',
      timestamp: dayStart,
      changePercent: ((lastPrice - firstPrice) / firstPrice) * 100,
      changeAmount: lastPrice - firstPrice,
      isDailyAggregate: true,
    });

    this.logger.log(`Daily aggregate created for ${metal} ${dayStart.toISOString()}`);
  }

  /**
   * One-time import of historical daily prices into the DB. Each day is upserted
   * as a daily-aggregate record keyed on its timestamp, so the operation is
   * idempotent — running it again refreshes values without creating duplicates.
   */
  async backfillDailyHistory(
    outputsize = 5000,
    metal: Metal = DEFAULT_METAL,
  ): Promise<{ provider: string; metal: Metal; fetched: number; inserted: number; updated: number } | null> {
    const history = await this.twelveDataProvider.fetchHistory('1day', outputsize, metal);

    if (!history || history.length === 0) {
      this.logger.warn(`Backfill: no historical data returned for ${metal} (check TWELVE_DATA_KEY)`);
      return null;
    }

    const ops = history.map((point) => ({
      updateOne: {
        filter: { metal, timestamp: point.timestamp, isDailyAggregate: true },
        update: {
          $set: {
            price: point.price,
            open: point.open,
            high: point.high,
            low: point.low,
            currency: 'USD',
            metal,
            provider: point.provider,
            changePercent: point.changePercent,
            changeAmount: point.changeAmount,
            timestamp: point.timestamp,
            isDailyAggregate: true,
            isHourlyAggregate: false,
          },
        },
        upsert: true,
      },
    }));

    const result = await this.goldPriceModel.bulkWrite(ops, { ordered: false });
    const inserted = result.upsertedCount || 0;
    const updated = result.modifiedCount || 0;

    this.logger.log(
      `Backfill complete for ${metal}: ${history.length} days fetched, ${inserted} inserted, ${updated} updated`,
    );

    return { provider: history[0].provider, metal, fetched: history.length, inserted, updated };
  }

  async cleanOldData(retentionDays: number = 90): Promise<void> {
    const cutoff = subDays(new Date(), retentionDays);
    const result = await this.goldPriceModel.deleteMany({
      timestamp: { $lt: cutoff },
      isHourlyAggregate: false,
      isDailyAggregate: false,
    });
    this.logger.log(`Cleaned ${result.deletedCount} old price records`);
  }

  async getPriceStats(metal: Metal = DEFAULT_METAL): Promise<any> {
    const cacheKey = `stats:${metal}`;
    const cached = await this.redis?.getJson<any>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const dayAgo = subHours(now, 24);
    const weekAgo = subDays(now, 7);
    const baseMatch = { metal, isHourlyAggregate: false, isDailyAggregate: false };

    // Compute high/low/open in the database rather than streaming every raw
    // (minute-level) document into Node. A single pass over the week window is
    // split into day/week buckets with $facet.
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
      currency: 'USD',
      timestamp: latest.timestamp,
      day: periodStats(day),
      week: week ? periodStats(week) : null,
    };

    // Short TTL: this is the hottest endpoint and prices update at most/minute.
    await this.redis?.setJson(cacheKey, result, 15);
    return result;
  }

  /**
   * Gold/Silver ratio — how many ounces of silver buy one ounce of gold. A
   * widely-watched relative-value gauge for precious-metals traders.
   */
  async getGoldSilverRatio(): Promise<{
    ratio: number;
    gold: number;
    silver: number;
    timestamp: Date;
  } | null> {
    const cached = await this.redis?.getJson<any>('ratio');
    if (cached) return cached;

    const [gold, silver] = await Promise.all([
      this.getLatestPrice('XAU'),
      this.getLatestPrice('XAG'),
    ]);

    if (!gold?.price || !silver?.price) return null;

    const newest =
      new Date(gold.timestamp) > new Date(silver.timestamp) ? gold.timestamp : silver.timestamp;

    const result = {
      ratio: gold.price / silver.price,
      gold: gold.price,
      silver: silver.price,
      timestamp: newest,
    };

    await this.redis?.setJson('ratio', result, 15);
    return result;
  }

  /**
   * All-time (well, full-history) high/low for a metal and how far the current
   * price sits from each. Uses daily aggregates for long-range coverage, falling
   * back to raw points when no aggregates exist yet.
   */
  async getRecords(metal: Metal = DEFAULT_METAL): Promise<{
    metal: Metal;
    high: number;
    low: number;
    current: number;
    fromHighPercent: number;
    fromLowPercent: number;
    since: Date | null;
    days: number;
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
        {
          $group: {
            _id: null,
            high: { $max: '$price' },
            low: { $min: '$price' },
            since: { $min: '$timestamp' },
          },
        },
      ]);
      if (!raw) return null;
      high = raw.high;
      low = raw.low;
      since = raw.since;
      days = 0;
    }

    return {
      metal,
      high,
      low,
      current: current.price,
      fromHighPercent: high ? ((current.price - high) / high) * 100 : 0,
      fromLowPercent: low ? ((current.price - low) / low) * 100 : 0,
      since,
      days,
    };
  }

  /** Exports raw price history as CSV text for the given metal/window. */
  async exportHistoryCsv(hours = 720, metal: Metal = DEFAULT_METAL): Promise<string> {
    const rows = await this.getPriceHistory(hours, 50000, metal);
    const header = 'timestamp,metal,price,open,high,low,changePercent,provider';
    const lines = rows.map((r) =>
      [
        new Date(r.timestamp).toISOString(),
        r.metal,
        r.price,
        r.open ?? '',
        r.high ?? '',
        r.low ?? '',
        r.changePercent ?? '',
        r.provider,
      ].join(','),
    );
    return [header, ...lines].join('\n');
  }
}
