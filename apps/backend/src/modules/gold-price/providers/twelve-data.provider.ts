import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { GoldPriceData } from './goldapi.provider';
import { Metal, DEFAULT_METAL } from '../metal.types';

@Injectable()
export class TwelveDataProvider {
  private readonly logger = new Logger(TwelveDataProvider.name);

  constructor(private configService: ConfigService) {}

  async fetchPrice(metal: Metal = DEFAULT_METAL): Promise<GoldPriceData | null> {
    const apiKey = this.configService.get<string>('apis.twelveData.key');
    const baseUrl = this.configService.get<string>('apis.twelveData.baseUrl');

    if (!apiKey) {
      this.logger.warn('TwelveData API key not configured');
      return null;
    }

    try {
      const response = await axios.get(`${baseUrl}/price`, {
        params: {
          symbol: `${metal}/USD`,
          apikey: apiKey,
        },
        timeout: 10000,
      });

      const data = response.data;

      if (data.status === 'error' || !data.price) return null;

      return {
        price: parseFloat(data.price),
        currency: 'USD',
        metal,
        provider: 'twelvedata',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`TwelveData fetch failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Fetches historical OHLC candles for XAU/USD in a single call. Used for the
   * one-time history backfill. Returns oldest-first, or null on failure.
   */
  async fetchHistory(
    interval = '1day',
    outputsize = 5000,
    metal: Metal = DEFAULT_METAL,
  ): Promise<GoldPriceData[] | null> {
    const apiKey = this.configService.get<string>('apis.twelveData.key');
    const baseUrl = this.configService.get<string>('apis.twelveData.baseUrl');

    if (!apiKey) {
      this.logger.warn('TwelveData API key not configured');
      return null;
    }

    try {
      const response = await axios.get(`${baseUrl}/time_series`, {
        params: {
          symbol: `${metal}/USD`,
          interval,
          outputsize,
          order: 'ASC',
          apikey: apiKey,
        },
        timeout: 20000,
      });

      const data = response.data;

      if (data.status === 'error' || !Array.isArray(data.values)) {
        this.logger.error(`TwelveData history error: ${data.message || 'no values returned'}`);
        return null;
      }

      return data.values.map((v: any): GoldPriceData => {
        const open = parseFloat(v.open);
        const close = parseFloat(v.close);
        return {
          price: close,
          open,
          high: parseFloat(v.high),
          low: parseFloat(v.low),
          currency: 'USD',
          metal,
          provider: 'twelvedata',
          timestamp: new Date(v.datetime),
          changeAmount: close - open,
          changePercent: open ? ((close - open) / open) * 100 : 0,
        };
      });
    } catch (error) {
      this.logger.error(`TwelveData history fetch failed: ${error.message}`);
      return null;
    }
  }
}
