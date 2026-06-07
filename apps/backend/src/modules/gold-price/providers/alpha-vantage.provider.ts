import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { GoldPriceData } from './goldapi.provider';
import { Metal, DEFAULT_METAL } from '../metal.types';

@Injectable()
export class AlphaVantageProvider {
  private readonly logger = new Logger(AlphaVantageProvider.name);

  constructor(private configService: ConfigService) {}

  async fetchPrice(metal: Metal = DEFAULT_METAL): Promise<GoldPriceData | null> {
    const apiKey = this.configService.get<string>('apis.alphaVantage.key');
    const baseUrl = this.configService.get<string>('apis.alphaVantage.baseUrl');

    if (!apiKey) {
      this.logger.warn('AlphaVantage API key not configured');
      return null;
    }

    try {
      const response = await axios.get(baseUrl, {
        params: {
          function: 'CURRENCY_EXCHANGE_RATE',
          from_currency: metal,
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
        metal,
        provider: 'alphavantage',
        timestamp: new Date(data['6. Last Refreshed']),
      };
    } catch (error) {
      this.logger.error(`AlphaVantage fetch failed: ${error.message}`);
      return null;
    }
  }
}
