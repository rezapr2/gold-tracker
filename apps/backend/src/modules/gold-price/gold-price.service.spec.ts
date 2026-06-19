import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { GoldPriceService } from './gold-price.service';
import { GoldPrice } from './schemas/gold-price.schema';
import { GoldApiProvider } from './providers/goldapi.provider';
import { MetalsDevProvider } from './providers/metals-dev.provider';
import { TwelveDataProvider } from './providers/twelve-data.provider';
import { AlphaVantageProvider } from './providers/alpha-vantage.provider';

// Builds a Mongoose-query stand-in that works both when awaited directly
// (`await model.findOne()`) and when chained (`.sort().lean().exec()`).
const queryResult = (value: any) => {
  const q: any = {
    sort: jest.fn(() => q),
    limit: jest.fn(() => q),
    lean: jest.fn(() => q),
    exec: jest.fn(() => Promise.resolve(value)),
    then: (resolve: any, reject: any) => Promise.resolve(value).then(resolve, reject),
  };
  return q;
};

const mockGoldPriceModel = {
  create: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  aggregate: jest.fn(),
  deleteMany: jest.fn(),
  bulkWrite: jest.fn(),
};

// Each provider now declares which assets it supports; default to "supports
// everything" so the existing fetch flow is exercised (clearAllMocks keeps this
// inline implementation between tests).
const mockGoldApiProvider = { fetchPrice: jest.fn(), supports: jest.fn(() => true) };
const mockMetalsDevProvider = { fetchPrice: jest.fn(), supports: jest.fn(() => true) };
const mockTwelveDataProvider = { fetchPrice: jest.fn(), fetchHistory: jest.fn(), supports: jest.fn(() => true) };
const mockAlphaVantageProvider = { fetchPrice: jest.fn(), supports: jest.fn(() => true) };

describe('GoldPriceService', () => {
  let service: GoldPriceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoldPriceService,
        { provide: getModelToken(GoldPrice.name), useValue: mockGoldPriceModel },
        { provide: GoldApiProvider, useValue: mockGoldApiProvider },
        { provide: MetalsDevProvider, useValue: mockMetalsDevProvider },
        { provide: TwelveDataProvider, useValue: mockTwelveDataProvider },
        { provide: AlphaVantageProvider, useValue: mockAlphaVantageProvider },
      ],
    }).compile();

    service = module.get<GoldPriceService>(GoldPriceService);
    jest.clearAllMocks();
  });

  describe('fetchAndSavePrice', () => {
    it('should use primary provider when available', async () => {
      const priceData = {
        price: 2400.5,
        currency: 'USD',
        metal: 'XAU',
        provider: 'goldapi',
        timestamp: new Date(),
      };
      mockGoldApiProvider.fetchPrice.mockResolvedValue(priceData);
      // isDuplicate -> none; getLatestPrice -> no previous price.
      mockGoldPriceModel.findOne.mockReturnValue(queryResult(null));
      mockGoldPriceModel.create.mockResolvedValue({ ...priceData, _id: 'test-id' });

      const result = await service.fetchAndSavePrice();

      expect(mockGoldApiProvider.fetchPrice).toHaveBeenCalledTimes(1);
      expect(mockMetalsDevProvider.fetchPrice).not.toHaveBeenCalled();
      expect(mockGoldPriceModel.create).toHaveBeenCalled();
      expect(result).toBeTruthy();
    });

    it('should fall back to secondary provider when primary fails', async () => {
      const priceData = {
        price: 2401.0,
        currency: 'USD',
        metal: 'XAU',
        provider: 'metals.dev',
        timestamp: new Date(),
      };
      mockGoldApiProvider.fetchPrice.mockResolvedValue(null);
      mockMetalsDevProvider.fetchPrice.mockResolvedValue(priceData);
      mockGoldPriceModel.findOne.mockReturnValue(queryResult(null));
      mockGoldPriceModel.create.mockResolvedValue({ ...priceData, _id: 'test-id' });

      const result = await service.fetchAndSavePrice();

      expect(mockGoldApiProvider.fetchPrice).toHaveBeenCalledTimes(1);
      expect(mockMetalsDevProvider.fetchPrice).toHaveBeenCalledTimes(1);
      expect(result).toBeTruthy();
    });

    it('should return null when all providers fail', async () => {
      mockGoldApiProvider.fetchPrice.mockResolvedValue(null);
      mockMetalsDevProvider.fetchPrice.mockResolvedValue(null);
      mockTwelveDataProvider.fetchPrice.mockResolvedValue(null);
      mockAlphaVantageProvider.fetchPrice.mockResolvedValue(null);

      const result = await service.fetchAndSavePrice();

      expect(result).toBeNull();
      expect(mockGoldPriceModel.create).not.toHaveBeenCalled();
    });

    it('should skip saving duplicate prices', async () => {
      const priceData = {
        price: 2400.5,
        currency: 'USD',
        metal: 'XAU',
        provider: 'goldapi',
        timestamp: new Date(),
      };
      mockGoldApiProvider.fetchPrice.mockResolvedValue(priceData);
      mockGoldPriceModel.findOne.mockReturnValue(queryResult({ _id: 'existing', price: 2400.5 }));

      const result = await service.fetchAndSavePrice();

      expect(result).toBeNull();
      expect(mockGoldPriceModel.create).not.toHaveBeenCalled();
    });

    it('should fetch and tag the requested metal (silver)', async () => {
      const priceData = { price: 30.5, currency: 'USD', metal: 'XAG', provider: 'metals.dev', timestamp: new Date() };
      mockGoldApiProvider.fetchPrice.mockResolvedValue(priceData);
      mockGoldPriceModel.findOne.mockReturnValue(queryResult(null));
      mockGoldPriceModel.create.mockImplementation((doc) => Promise.resolve(doc));

      await service.fetchAndSavePrice('XAG');

      expect(mockGoldApiProvider.fetchPrice).toHaveBeenCalledWith('XAG');
      expect(mockGoldPriceModel.create.mock.calls[0][0].metal).toBe('XAG');
    });

    it('should compute change relative to the last stored price', async () => {
      const priceData = {
        price: 2420,
        currency: 'USD',
        metal: 'XAU',
        provider: 'metals.dev',
        timestamp: new Date(),
      };
      mockGoldApiProvider.fetchPrice.mockResolvedValue(priceData);
      // first findOne (isDuplicate) -> none, second (getLatestPrice) -> previous 2400.
      mockGoldPriceModel.findOne
        .mockReturnValueOnce(queryResult(null))
        .mockReturnValueOnce(queryResult({ price: 2400 }));
      mockGoldPriceModel.create.mockImplementation((doc) => Promise.resolve(doc));

      await service.fetchAndSavePrice();

      const saved = mockGoldPriceModel.create.mock.calls[0][0];
      expect(saved.changeAmount).toBeCloseTo(20);
      expect(saved.changePercent).toBeCloseTo((20 / 2400) * 100);
    });
  });

  describe('getLatestPrice', () => {
    it('should return most recent non-aggregate price', async () => {
      const mockPrice = { price: 2400, timestamp: new Date() };
      mockGoldPriceModel.findOne.mockReturnValue(queryResult(mockPrice));

      const result = await service.getLatestPrice();
      expect(result).toEqual(mockPrice);
    });
  });

  describe('getPriceStats', () => {
    it('should derive period stats from the aggregation result', async () => {
      const latest = { price: 2450, timestamp: new Date() };
      mockGoldPriceModel.findOne.mockReturnValue(queryResult(latest));
      mockGoldPriceModel.aggregate.mockResolvedValue([
        {
          day: [{ high: 2460, low: 2400, open: 2410 }],
          week: [{ high: 2460, low: 2350, open: 2360 }],
        },
      ]);

      const stats = await service.getPriceStats();

      expect(stats.current).toBe(2450);
      expect(stats.day.changeAmount).toBeCloseTo(40);
      expect(stats.day.changePercent).toBeCloseTo((40 / 2410) * 100);
      expect(stats.week.high).toBe(2460);
    });

    it('should return null when there is no day data', async () => {
      mockGoldPriceModel.findOne.mockReturnValue(queryResult({ price: 2450 }));
      mockGoldPriceModel.aggregate.mockResolvedValue([{ day: [], week: [] }]);

      const stats = await service.getPriceStats();
      expect(stats).toBeNull();
    });
  });

  describe('getGoldSilverRatio', () => {
    it('divides the latest gold price by the latest silver price', async () => {
      mockGoldPriceModel.findOne
        .mockReturnValueOnce(queryResult({ price: 2400, timestamp: new Date('2024-05-02') })) // XAU
        .mockReturnValueOnce(queryResult({ price: 30, timestamp: new Date('2024-05-01') })); // XAG

      const result = await service.getGoldSilverRatio();

      expect(result?.ratio).toBeCloseTo(80);
      expect(result?.gold).toBe(2400);
      expect(result?.silver).toBe(30);
    });

    it('returns null when a metal has no price yet', async () => {
      mockGoldPriceModel.findOne
        .mockReturnValueOnce(queryResult({ price: 2400, timestamp: new Date() }))
        .mockReturnValueOnce(queryResult(null));

      expect(await service.getGoldSilverRatio()).toBeNull();
    });
  });

  describe('getRecords', () => {
    it('reports all-time high/low from daily aggregates and distance from each', async () => {
      mockGoldPriceModel.findOne.mockReturnValue(queryResult({ price: 2450, timestamp: new Date() }));
      mockGoldPriceModel.aggregate.mockResolvedValue([
        { high: 2500, low: 1800, since: new Date('2022-01-01'), days: 800 },
      ]);

      const result = await service.getRecords('XAU');

      expect(result?.high).toBe(2500);
      expect(result?.low).toBe(1800);
      expect(result?.fromHighPercent).toBeCloseTo(((2450 - 2500) / 2500) * 100);
      expect(result?.days).toBe(800);
    });

    it('returns null when there is no price for the metal', async () => {
      mockGoldPriceModel.findOne.mockReturnValue(queryResult(null));
      expect(await service.getRecords('XAG')).toBeNull();
    });
  });

  describe('exportHistoryCsv', () => {
    it('produces a CSV header and one line per row', async () => {
      mockGoldPriceModel.find.mockReturnValue(
        queryResult([
          { timestamp: new Date('2024-05-01T00:00:00Z'), metal: 'XAU', price: 2400, open: 2390, high: 2410, low: 2385, changePercent: 0.4, provider: 'goldapi' },
        ]),
      );

      const csv = await service.exportHistoryCsv(24, 'XAU');
      const lines = csv.split('\n');

      expect(lines[0]).toBe('timestamp,metal,price,open,high,low,changePercent,provider');
      expect(lines).toHaveLength(2);
      expect(lines[1]).toContain('XAU,2400,2390,2410,2385,0.4,goldapi');
    });
  });

  describe('backfillDailyHistory', () => {
    it('upserts each historical day as a daily aggregate', async () => {
      const history = [
        { price: 2310, open: 2300, high: 2320, low: 2290, provider: 'twelvedata', timestamp: new Date('2024-05-01'), changeAmount: 10, changePercent: 0.43 },
        { price: 2340, open: 2310, high: 2350, low: 2305, provider: 'twelvedata', timestamp: new Date('2024-05-02'), changeAmount: 30, changePercent: 1.3 },
      ];
      mockTwelveDataProvider.fetchHistory.mockResolvedValue(history);
      mockGoldPriceModel.bulkWrite.mockResolvedValue({ upsertedCount: 2, modifiedCount: 0 });

      const result = await service.backfillDailyHistory(100);

      expect(mockTwelveDataProvider.fetchHistory).toHaveBeenCalledWith('1day', 100, 'XAU');
      expect(mockGoldPriceModel.bulkWrite).toHaveBeenCalledTimes(1);
      const ops = mockGoldPriceModel.bulkWrite.mock.calls[0][0];
      expect(ops).toHaveLength(2);
      expect(ops[0].updateOne.filter).toEqual({ metal: 'XAU', timestamp: history[0].timestamp, isDailyAggregate: true });
      expect(ops[0].updateOne.upsert).toBe(true);
      expect(result).toEqual({ provider: 'twelvedata', metal: 'XAU', fetched: 2, inserted: 2, updated: 0 });
    });

    it('backfills silver when XAG is requested', async () => {
      mockTwelveDataProvider.fetchHistory.mockResolvedValue([
        { price: 30.5, open: 30, high: 31, low: 29.8, provider: 'twelvedata', timestamp: new Date('2024-05-01'), changeAmount: 0.5, changePercent: 1.6 },
      ]);
      mockGoldPriceModel.bulkWrite.mockResolvedValue({ upsertedCount: 1, modifiedCount: 0 });

      const result = await service.backfillDailyHistory(100, 'XAG');

      expect(mockTwelveDataProvider.fetchHistory).toHaveBeenCalledWith('1day', 100, 'XAG');
      const ops = mockGoldPriceModel.bulkWrite.mock.calls[0][0];
      expect(ops[0].updateOne.filter.metal).toBe('XAG');
      expect(result?.metal).toBe('XAG');
    });

    it('returns null when the provider yields no history', async () => {
      mockTwelveDataProvider.fetchHistory.mockResolvedValue(null);
      const result = await service.backfillDailyHistory();
      expect(result).toBeNull();
      expect(mockGoldPriceModel.bulkWrite).not.toHaveBeenCalled();
    });
  });
});
