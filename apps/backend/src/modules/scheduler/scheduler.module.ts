import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerService } from './scheduler.service';
import { GoldPriceModule } from '../gold-price/gold-price.module';
import { TelegramModule } from '../telegram/telegram.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    GoldPriceModule,
    TelegramModule,
    AnalyticsModule,
    WebsocketModule,
  ],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
