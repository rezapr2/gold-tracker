import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { GoldApiComProvider } from './gold-api-com.provider';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('GoldApiComProvider', () => {
  const config: Record<string, any> = {
    'apis.goldApiCom.baseUrl': 'https://api.gold-api.com',
  };
  const provider = new GoldApiComProvider({ get: (k: string) => config[k] } as ConfigService);

  afterEach(() => jest.clearAllMocks());

  it('maps the keyless gold-api.com response', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        currency: 'USD',
        name: 'Gold',
        price: 4156.700195,
        symbol: 'XAU',
        updatedAt: '2026-06-19T20:16:13Z',
      },
    });

    const result = await provider.fetchPrice();

    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://api.gold-api.com/price/XAU/USD',
      expect.anything(),
    );
    expect(result?.price).toBe(4156.700195);
    expect(result?.provider).toBe('gold-api.com');
    expect(result?.metal).toBe('XAU');
    expect(result?.timestamp).toEqual(new Date('2026-06-19T20:16:13Z'));
  });

  it('requests the silver symbol when XAG is passed', async () => {
    mockedAxios.get.mockResolvedValue({
      data: { price: 52.3, currency: 'USD', symbol: 'XAG', updatedAt: '2026-06-19T20:16:13Z' },
    });

    const result = await provider.fetchPrice('XAG');

    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://api.gold-api.com/price/XAG/USD',
      expect.anything(),
    );
    expect(result?.metal).toBe('XAG');
  });

  it('returns null when the payload has no numeric price', async () => {
    mockedAxios.get.mockResolvedValue({ data: { error: 'not found' } });
    expect(await provider.fetchPrice()).toBeNull();
  });

  it('returns null on request failure', async () => {
    mockedAxios.get.mockRejectedValue(new Error('network'));
    expect(await provider.fetchPrice()).toBeNull();
  });
});
