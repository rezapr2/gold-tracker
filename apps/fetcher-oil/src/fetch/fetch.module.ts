import { Module } from '@nestjs/common';
import { FetchService } from './fetch.service';
import { FetchEventsController } from './fetch-events.controller';
import { TwelveDataProvider } from '../providers/twelve-data.provider';

@Module({
  controllers: [FetchEventsController],
  providers: [FetchService, TwelveDataProvider],
})
export class FetchModule {}
