import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { GoldPriceData, PriceProvider } from './price-provider.interface';
import { Asset, DEFAULT_ASSET, getAsset } from '@gold-tracker/shared';

/**
 * gold-api.com — a free, **keyless** metals price source.
 *
 * Because it has no API key and no per-day/month quota to exhaust (unlike the
 * key-gated providers that return 403/429 once their free tier is spent), it
 * sits first in the failover chain so the rate-limited providers are only ever
 * used as backups. The asset `code` (XAU/XAG) doubles as the request symbol.
 */
@Injectable()
export class GoldApiComProvider implements PriceProvider {
  readonly name = 'goldapicom';
  private readonly logger = new Logger(GoldApiComProvider.name);

  constructor(private configService: ConfigService) {}

  supports(asset: Asset): boolean {
    return getAsset(asset).providers.includes(this.name);
  }

  async fetchPrice(asset: Asset = DEFAULT_ASSET): Promise<GoldPriceData | null> {
    const baseUrl = this.configService.get<string>('apis.goldApiCom.baseUrl');
    const code = getAsset(asset).code;

    try {
      const response = await axios.get(`${baseUrl}/price/${code}/USD`, {
        timeout: 10000,
      });

      const data = response.data;
      if (typeof data?.price !== 'number') return null;

      return {
        price: data.price,
        currency: data.currency || 'USD',
        metal: asset,
        provider: 'gold-api.com',
        // API returns an ISO `updatedAt`; fall back to now if it's missing.
        timestamp: data.updatedAt ? new Date(data.updatedAt) : new Date(),
      };
    } catch (error) {
      this.logger.error(`gold-api.com fetch failed: ${error.message}`);
      return null;
    }
  }
}
