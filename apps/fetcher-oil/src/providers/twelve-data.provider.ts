import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { GoldPriceData, PriceProvider } from './price-provider.interface';
import { Asset, DEFAULT_ASSET, getAsset, symbolFor } from '@gold-tracker/shared';
import { SettingsStoreService } from '../settings/settings-store.service';

@Injectable()
export class TwelveDataProvider implements PriceProvider {
  readonly name = 'twelvedata';
  private readonly logger = new Logger(TwelveDataProvider.name);

  constructor(
    private configService: ConfigService,
    private settings: SettingsStoreService,
  ) {}

  supports(asset: Asset): boolean {
    return getAsset(asset).providers.includes(this.name);
  }

  async fetchPrice(asset: Asset = DEFAULT_ASSET): Promise<GoldPriceData | null> {
    const apiKey = await this.settings.apiKey('twelveData');
    const baseUrl = this.configService.get<string>('apis.twelveData.baseUrl');

    if (!apiKey) {
      this.logger.warn('TwelveData API key not configured');
      return null;
    }

    try {
      const response = await axios.get(`${baseUrl}/price`, {
        params: {
          symbol: symbolFor(asset, this.name),
          apikey: apiKey,
        },
        timeout: 10000,
      });

      const data = response.data;

      if (data.status === 'error' || !data.price) return null;

      return {
        price: parseFloat(data.price),
        currency: 'USD',
        metal: asset,
        provider: 'twelvedata',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`TwelveData fetch failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Fetches historical OHLC candles for an asset in a single call. Used for the
   * one-time history backfill. Returns oldest-first, or null on failure.
   */
  async fetchHistory(
    interval = '1day',
    outputsize = 5000,
    asset: Asset = DEFAULT_ASSET,
  ): Promise<GoldPriceData[] | null> {
    const apiKey = await this.settings.apiKey('twelveData');
    const baseUrl = this.configService.get<string>('apis.twelveData.baseUrl');

    if (!apiKey) {
      this.logger.warn('TwelveData API key not configured');
      return null;
    }

    try {
      const response = await axios.get(`${baseUrl}/time_series`, {
        params: {
          symbol: symbolFor(asset, this.name),
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
          metal: asset,
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
