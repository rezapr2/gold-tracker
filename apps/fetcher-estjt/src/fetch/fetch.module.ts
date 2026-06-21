import { Module } from '@nestjs/common';
import { FetchService } from './fetch.service';
import { FetchEventsController } from './fetch-events.controller';
import { EstjtProvider } from '../providers/estjt.provider';

@Module({
  controllers: [FetchEventsController],
  providers: [FetchService, EstjtProvider],
})
export class FetchModule {}
