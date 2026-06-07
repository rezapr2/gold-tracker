import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { GoldPriceData } from './goldapi.provider';
import { Metal, DEFAULT_METAL } from '../metal.types';

const METALS_DEV_KEYS: Record<Metal, string> = { XAU: 'gold', XAG: 'silver' };

@Injectable()
export class MetalsDevProvider {
  private readonly logger = new Logger(MetalsDevProvider.name);

  constructor(private configService: ConfigService) {}

  async fetchPrice(metal: Metal = DEFAULT_METAL): Promise<GoldPriceData | null> {
    const apiKey = this.configService.get<string>('apis.metalsDev.key');
    const baseUrl = this.configService.get<string>('apis.metalsDev.baseUrl');

    if (!apiKey) {
      this.logger.warn('Metals.dev API key not configured');
      return null;
    }

    const metalKey = METALS_DEV_KEYS[metal];

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
        metal,
        provider: 'metals.dev',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Metals.dev fetch failed: ${error.message}`);
      return null;
    }
  }
}
