import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { GoldPriceData, PriceProvider } from './price-provider.interface';
import { Asset, DEFAULT_ASSET, getAsset } from '@gold-tracker/shared';
import { SettingsStoreService } from '../settings/settings-store.service';

// Metals.dev's per-metal slug. A new metal needs an entry here; non-metals are
// declared to skip this provider via the registry's `providers` list.
const METALS_DEV_KEYS: Record<string, string> = { XAU: 'gold', XAG: 'silver' };

@Injectable()
export class MetalsDevProvider implements PriceProvider {
  readonly name = 'metalsdev';
  private readonly logger = new Logger(MetalsDevProvider.name);

  constructor(
    private configService: ConfigService,
    private settings: SettingsStoreService,
  ) {}

  supports(asset: Asset): boolean {
    return getAsset(asset).providers.includes(this.name) && asset in METALS_DEV_KEYS;
  }

  async fetchPrice(asset: Asset = DEFAULT_ASSET): Promise<GoldPriceData | null> {
    const apiKey = await this.settings.apiKey('metalsDev');
    const baseUrl = this.configService.get<string>('apis.metalsDev.baseUrl');

    if (!apiKey) {
      this.logger.warn('Metals.dev API key not configured');
      return null;
    }

    const metalKey = METALS_DEV_KEYS[asset];
    if (!metalKey) return null;

    try {
      const response = await axios.get(`${baseUrl}/latest`, {
        params: {
          api_key: apiKey,
          currency: 'USD',
          unit: 'toz',
          metals: metalKey,
        },
        timeout: 10000,
      });

      const data = response.data;
      const price = data.metals?.[metalKey];

      if (!price) return null;

      return {
        price,
        currency: data.currency || 'USD',
        metal: asset,
        provider: 'metals.dev',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Metals.dev fetch failed: ${error.message}`);
      return null;
    }
  }
}
