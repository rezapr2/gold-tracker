import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Metal, DEFAULT_METAL } from '../metal.types';

export interface GoldPriceData {
  price: number;
  buyPrice?: number;
  sellPrice?: number;
  high?: number;
  low?: number;
  open?: number;
  currency: string;
  metal: string;
  provider: string;
  timestamp: Date;
  changePercent?: number;
  changeAmount?: number;
}

@Injectable()
export class GoldApiProvider {
  private readonly logger = new Logger(GoldApiProvider.name);

  constructor(private configService: ConfigService) {}

  async fetchPrice(metal: Metal = DEFAULT_METAL): Promise<GoldPriceData | null> {
    const apiKey = this.configService.get<string>('apis.goldapi.key');
    const baseUrl = this.configService.get<string>('apis.goldapi.baseUrl');

    if (!apiKey) {
      this.logger.warn('GoldAPI key not configured');
      return null;
    }

    try {
      const response = await axios.get(`${baseUrl}/${metal}/USD`, {
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
        metal: data.metal || metal,
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
