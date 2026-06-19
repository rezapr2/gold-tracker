import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { TwelveDataProvider } from './twelve-data.provider';
import { SettingsStoreService } from '../../settings/settings-store.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const storeWithKey = (key?: string) =>
  ({ apiKey: async () => key ?? '' }) as unknown as SettingsStoreService;

describe('TwelveDataProvider', () => {
  const config: Record<string, any> = {
    'apis.twelveData.key': 'test-key',
    'apis.twelveData.baseUrl': 'https://api.twelvedata.com',
  };
  const provider = new TwelveDataProvider(
    { get: (k: string) => config[k] } as ConfigService,
    storeWithKey('test-key'),
  );

  afterEach(() => jest.clearAllMocks());

  describe('fetchHistory', () => {
    it('maps OHLC candles and derives daily change', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          status: 'ok',
          values: [
            { datetime: '2024-05-01', open: '2300', high: '2320', low: '2290', close: '2310' },
            { datetime: '2024-05-02', open: '2310', high: '2350', low: '2305', close: '2340' },
          ],
        },
      });

      const result = await provider.fetchHistory('1day', 100);

      expect(result).toHaveLength(2);
      expect(result![0]).toMatchObject({ price: 2310, open: 2300, high: 2320, low: 2290 });
      expect(result![0].changeAmount).toBeCloseTo(10);
      expect(result![0].changePercent).toBeCloseTo((10 / 2300) * 100);
      expect(result![0].provider).toBe('twelvedata');
    });

    it('returns null without an API key', async () => {
      const noKey = new TwelveDataProvider({ get: () => undefined } as unknown as ConfigService, storeWithKey());
      expect(await noKey.fetchHistory()).toBeNull();
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('returns null on an API error payload', async () => {
      mockedAxios.get.mockResolvedValue({ data: { status: 'error', message: 'bad symbol' } });
      expect(await provider.fetchHistory()).toBeNull();
    });
  });
});
