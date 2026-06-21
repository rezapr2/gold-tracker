import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { GoldPriceService } from './gold-price.service';
import { GoldPrice } from './schemas/gold-price.schema';

// Mongoose-query stand-in that works awaited directly or chained.
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

const mockModel = {
  create: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  aggregate: jest.fn(),
  deleteMany: jest.fn(),
};

describe('GoldPriceService (core)', () => {
  let service: GoldPriceService;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        GoldPriceService,
        { provide: getModelToken(GoldPrice.name), useValue: mockModel },
      ],
    }).compile();
    service = moduleRef.get(GoldPriceService);
    jest.clearAllMocks();
  });

  describe('ingestPrice', () => {
    const data = { price: 2400.5, currency: 'USD', metal: 'XAU', provider: 'gold-api.com', timestamp: new Date() };

    it('persists a fresh price and computes change vs the last stored price', async () => {
      mockModel.findOne
        .mockReturnValueOnce(queryResult(null)) // isDuplicate -> none
        .mockReturnValueOnce(queryResult({ price: 2400 })); // getLatestPrice -> previous
      mockModel.create.mockImplementation((doc) => Promise.resolve(doc));

      const saved = await service.ingestPrice({ ...data, price: 2420 });

      const created = mockModel.create.mock.calls[0][0];
      expect(created.metal).toBe('XAU');
      expect(created.changeAmount).toBeCloseTo(20);
      expect(created.changePercent).toBeCloseTo((20 / 2400) * 100);
      expect(saved).toBeTruthy();
    });

    it('skips duplicates within the dedup window', async () => {
      mockModel.findOne.mockReturnValue(queryResult({ _id: 'existing', price: 2400.5 }));
      const saved = await service.ingestPrice(data);
      expect(saved).toBeNull();
      expect(mockModel.create).not.toHaveBeenCalled();
    });
  });

  describe('getPriceStats', () => {
    it('derives period stats from the aggregation result', async () => {
      mockModel.findOne.mockReturnValue(queryResult({ price: 2450, timestamp: new Date() }));
      mockModel.aggregate.mockResolvedValue([
        { day: [{ high: 2460, low: 2400, open: 2410 }], week: [{ high: 2460, low: 2350, open: 2360 }] },
      ]);

      const stats = await service.getPriceStats('XAU');
      expect(stats.current).toBe(2450);
      expect(stats.day.changeAmount).toBeCloseTo(40);
      expect(stats.week.high).toBe(2460);
    });
  });

  describe('getGoldSilverRatio', () => {
    it('divides gold by silver', async () => {
      mockModel.findOne
        .mockReturnValueOnce(queryResult({ price: 2400, timestamp: new Date('2024-05-02') }))
        .mockReturnValueOnce(queryResult({ price: 30, timestamp: new Date('2024-05-01') }));
      const r = await service.getGoldSilverRatio();
      expect(r?.ratio).toBeCloseTo(80);
    });
  });

  describe('exportHistoryCsv', () => {
    it('produces a header and one line per row', async () => {
      mockModel.find.mockReturnValue(
        queryResult([
          { timestamp: new Date('2024-05-01T00:00:00Z'), metal: 'XAU', price: 2400, open: 2390, high: 2410, low: 2385, changePercent: 0.4, provider: 'goldapi' },
        ]),
      );
      const csv = await service.exportHistoryCsv(24, 'XAU');
      const lines = csv.split('\n');
      expect(lines[0]).toBe('timestamp,metal,price,open,high,low,changePercent,provider');
      expect(lines[1]).toContain('XAU,2400,2390,2410,2385,0.4,goldapi');
    });
  });
});
