import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { GoldApiProvider } from './goldapi.provider';
import { SettingsStoreService } from '../settings/settings-store.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const storeWithKey = (key?: string) =>
  ({ apiKey: async () => key ?? '' }) as unknown as SettingsStoreService;

describe('GoldApiProvider', () => {
  const config: Record<string, any> = {
    'apis.goldapi.key': 'test-key',
    'apis.goldapi.baseUrl': 'https://www.goldapi.io/api',
  };
  const provider = new GoldApiProvider(
    { get: (k: string) => config[k] } as ConfigService,
    storeWithKey('test-key'),
  );

  afterEach(() => jest.clearAllMocks());

  it('maps GoldAPI change fields correctly (chp=%, ch=amount)', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        price: 2400,
        currency: 'USD',
        metal: 'XAU',
        timestamp: 1_700_000_000,
        ch: 12.5, // absolute change
        chp: 0.52, // percent change
      },
    });

    const result = await provider.fetchPrice();

    expect(result?.changeAmount).toBe(12.5);
    expect(result?.changePercent).toBe(0.52);
    expect(result?.provider).toBe('goldapi');
  });

  it('requests the silver pair when XAG is passed', async () => {
    mockedAxios.get.mockResolvedValue({
      data: { price: 30.5, currency: 'USD', metal: 'XAG', timestamp: 1_700_000_000 },
    });

    const result = await provider.fetchPrice('XAG');

    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://www.goldapi.io/api/XAG/USD',
      expect.anything(),
    );
    expect(result?.metal).toBe('XAG');
  });

  it('returns null without an API key', async () => {
    const noKey = new GoldApiProvider({ get: () => undefined } as unknown as ConfigService, storeWithKey());
    expect(await noKey.fetchPrice()).toBeNull();
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it('returns null on request failure', async () => {
    mockedAxios.get.mockRejectedValue(new Error('network'));
    expect(await provider.fetchPrice()).toBeNull();
  });
});
