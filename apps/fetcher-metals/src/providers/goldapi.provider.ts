import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Asset, DEFAULT_ASSET, getAsset } from '@gold-tracker/shared';
import { GoldPriceData, PriceProvider } from './price-provider.interface';
import { SettingsStoreService } from '../settings/settings-store.service';

// Re-export so existing `import { GoldPriceData } from './goldapi.provider'`
// callers keep working; the canonical definition lives in the interface file.
export { GoldPriceData };

@Injectable()
export class GoldApiProvider implements PriceProvider {
  readonly name = 'goldapi';
  private readonly logger = new Logger(GoldApiProvider.name);

  constructor(
    private configService: ConfigService,
    private settings: SettingsStoreService,
  ) {}

  supports(asset: Asset): boolean {
    return getAsset(asset).providers.includes(this.name);
  }

  async fetchPrice(asset: Asset = DEFAULT_ASSET): Promise<GoldPriceData | null> {
    const apiKey = await this.settings.apiKey('goldapi');
    const baseUrl = this.configService.get<string>('apis.goldapi.baseUrl');

    if (!apiKey) {
      this.logger.warn('GoldAPI key not configured');
      return null;
    }

    const code = getAsset(asset).code;

    try {
      const response = await axios.get(`${baseUrl}/${code}/USD`, {
        headers: {
          'x-access-token': apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      const data = response.data;

      return {
        price: data.price,
        buyPrice: data.price_gram_24k ? data.price : undefined,
        sellPrice: data.price,
        high: data.high_price,
        low: data.low_price,
        open: data.open_price,
        currency: data.currency || 'USD',
        metal: data.metal || code,
        provider: 'goldapi',
        timestamp: new Date(data.timestamp * 1000),
        // GoldAPI: `ch` is the absolute change, `chp` is the percent change.
        changePercent: data.chp,
        changeAmount: data.ch,
      };
    } catch (error) {
      this.logger.error(`GoldAPI fetch failed: ${error.message}`);
      return null;
    }
  }
}
