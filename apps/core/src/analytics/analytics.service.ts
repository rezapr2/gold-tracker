import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PriceStatistics, PriceStatisticsDocument, StatsPeriod } from './schemas/price-statistics.schema';
import { GoldPrice, GoldPriceDocument } from '../price/schemas/gold-price.schema';
import { Metal, DEFAULT_METAL } from '@gold-tracker/shared';
import { subDays, subHours, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectModel(PriceStatistics.name) private statsModel: Model<PriceStatisticsDocument>,
    @InjectModel(GoldPrice.name) private goldPriceModel: Model<GoldPriceDocument>,
  ) {}

  async getDailyAnalytics(daysBack: number = 30, metal: Metal = DEFAULT_METAL): Promise<PriceStatistics[]> {
    const since = subDays(new Date(), daysBack);
    return this.statsModel
      .find({ metal, period: StatsPeriod.DAILY, periodStart: { $gte: since } })
      .sort({ periodStart: -1 })
      .lean()
      .exec();
  }

  async getWeeklyAnalytics(weeksBack: number = 12, metal: Metal = DEFAULT_METAL): Promise<PriceStatistics[]> {
    const since = subDays(new Date(), weeksBack * 7);
    return this.statsModel
      .find({ metal, period: StatsPeriod.WEEKLY, periodStart: { $gte: since } })
      .sort({ periodStart: -1 })
      .lean()
      .exec();
  }

  async getMonthlyAnalytics(monthsBack: number = 12, metal: Metal = DEFAULT_METAL): Promise<PriceStatistics[]> {
    const since = subDays(new Date(), monthsBack * 30);
    return this.statsModel
      .find({ metal, period: StatsPeriod.MONTHLY, periodStart: { $gte: since } })
      .sort({ periodStart: -1 })
      .lean()
      .exec();
  }

  async computeAndSaveDailyStats(date: Date = new Date(), metal: Metal = DEFAULT_METAL): Promise<PriceStatistics | null> {
    const start = startOfDay(subDays(date, 1));
    const end = endOfDay(subDays(date, 1));

    const existing = await this.statsModel.findOne({
      metal,
      period: StatsPeriod.DAILY,
      periodStart: start,
    });
    if (existing) return existing;

    const prices = await this.goldPriceModel
      .find({ metal, timestamp: { $gte: start, $lte: end }, isHourlyAggregate: false, isDailyAggregate: false })
      .sort({ timestamp: 1 })
      .lean();

    if (prices.length < 2) return null;

    return this.createStats(StatsPeriod.DAILY, start, end, prices, metal);
  }

  async computeAndSaveWeeklyStats(date: Date = new Date(), metal: Metal = DEFAULT_METAL): Promise<PriceStatistics | null> {
    const start = startOfWeek(subDays(date, 7));
    const end = endOfWeek(subDays(date, 7));

    const existing = await this.statsModel.findOne({ metal, period: StatsPeriod.WEEKLY, periodStart: start });
    if (existing) return existing;

    const prices = await this.goldPriceModel
      .find({ metal, timestamp: { $gte: start, $lte: end }, isHourlyAggregate: false, isDailyAggregate: false })
      .sort({ timestamp: 1 })
      .lean();

    if (prices.length < 2) return null;

    return this.createStats(StatsPeriod.WEEKLY, start, end, prices, metal);
  }

  async computeAndSaveMonthlyStats(date: Date = new Date(), metal: Metal = DEFAULT_METAL): Promise<PriceStatistics | null> {
    const start = startOfMonth(subDays(date, 30));
    const end = endOfMonth(subDays(date, 30));

    const existing = await this.statsModel.findOne({ metal, period: StatsPeriod.MONTHLY, periodStart: start });
    if (existing) return existing;

    const prices = await this.goldPriceModel
      .find({ metal, timestamp: { $gte: start, $lte: end }, isHourlyAggregate: false, isDailyAggregate: false })
      .sort({ timestamp: 1 })
      .lean();

    if (prices.length < 2) return null;

    return this.createStats(StatsPeriod.MONTHLY, start, end, prices, metal);
  }

  private async createStats(
    period: StatsPeriod,
    start: Date,
    end: Date,
    prices: GoldPrice[],
    metal: Metal = DEFAULT_METAL,
  ): Promise<PriceStatistics> {
    const values = prices.map((p) => p.price);
    const openPrice = values[0];
    const closePrice = values[values.length - 1];
    const highPrice = Math.max(...values);
    const lowPrice = Math.min(...values);
    const averagePrice = values.reduce((a, b) => a + b, 0) / values.length;
    const changePercent = ((closePrice - openPrice) / openPrice) * 100;
    const changeAmount = closePrice - openPrice;
    const volatility = this.calculateVolatility(values);

    return this.statsModel.create({
      metal,
      period,
      periodStart: start,
      periodEnd: end,
      openPrice,
      closePrice,
      highPrice,
      lowPrice,
      averagePrice,
      changePercent,
      changeAmount,
      volatility,
      dataPoints: values.length,
    });
  }

  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
    return Math.sqrt(variance);
  }

  async calculateMovingAverages(
    period: number = 7,
    metal: Metal = DEFAULT_METAL,
  ): Promise<{ date: Date; price: number; ma: number }[]> {
    const since = subDays(new Date(), period * 3);
    const prices = await this.goldPriceModel
      .find({ metal, timestamp: { $gte: since }, isDailyAggregate: true })
      .sort({ timestamp: 1 })
      .lean();

    return prices.map((p, i) => {
      const slice = prices.slice(Math.max(0, i - period + 1), i + 1);
      const ma = slice.reduce((a, b) => a + b.price, 0) / slice.length;
      return { date: p.timestamp, price: p.price, ma };
    });
  }

  async getSummary(metal: Metal = DEFAULT_METAL): Promise<any> {
    const [daily, weekly, monthly] = await Promise.all([
      this.statsModel.findOne({ metal, period: StatsPeriod.DAILY }).sort({ periodStart: -1 }).lean(),
      this.statsModel.findOne({ metal, period: StatsPeriod.WEEKLY }).sort({ periodStart: -1 }).lean(),
      this.statsModel.findOne({ metal, period: StatsPeriod.MONTHLY }).sort({ periodStart: -1 }).lean(),
    ]);

    return { metal, daily, weekly, monthly };
  }
}
