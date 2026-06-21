import { Module } from '@nestjs/common';
import { FetchService } from './fetch.service';
import { FetchEventsController } from './fetch-events.controller';
import { GoldApiComProvider } from '../providers/gold-api-com.provider';
import { GoldApiProvider } from '../providers/goldapi.provider';
import { MetalsDevProvider } from '../providers/metals-dev.provider';
import { TwelveDataProvider } from '../providers/twelve-data.provider';
import { AlphaVantageProvider } from '../providers/alpha-vantage.provider';

@Module({
  controllers: [FetchEventsController],
  providers: [
    FetchService,
    GoldApiComProvider,
    GoldApiProvider,
    MetalsDevProvider,
    TwelveDataProvider,
    AlphaVantageProvider,
  ],
})
export class FetchModule {}
