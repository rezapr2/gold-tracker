import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { GoldPriceData, PriceProvider } from './price-provider.interface';
import { Asset, DEFAULT_ASSET, getAsset } from '@gold-tracker/shared';
import { SettingsStoreService } from '../settings/settings-store.service';

@Injectable()
export class AlphaVantageProvider implements PriceProvider {
  readonly name = 'alphavantage';
  private readonly logger = new Logger(AlphaVantageProvider.name);

  constructor(
    private configService: ConfigService,
    private settings: SettingsStoreService,
  ) {}

  supports(asset: Asset): boolean {
    return getAsset(asset).providers.includes(this.name);
  }

  async fetchPrice(asset: Asset = DEFAULT_ASSET): Promise<GoldPriceData | null> {
    const apiKey = await this.settings.apiKey('alphaVantage');
    const baseUrl = this.configService.get<string>('apis.alphaVantage.baseUrl');

    if (!apiKey) {
      this.logger.warn('AlphaVantage API key not configured');
      return null;
    }

    try {
      const response = await axios.get(baseUrl, {
        params: {
          function: 'CURRENCY_EXCHANGE_RATE',
          from_currency: getAsset(asset).code,
          to_currency: 'USD',
          apikey: apiKey,
        },
        timeout: 10000,
      });

      const data = response.data['Realtime Currency Exchange Rate'];

      if (!data) return null;

      return {
        price: parseFloat(data['5. Exchange Rate']),
        buyPrice: parseFloat(data['8. Bid Price']),
        sellPrice: parseFloat(data['9. Ask Price']),
        currency: 'USD',
        metal: asset,
        provider: 'alphavantage',
        timestamp: new Date(data['6. Last Refreshed']),
      };
    } catch (error) {
      this.logger.error(`AlphaVantage fetch failed: ${error.message}`);
      return null;
    }
  }
}
