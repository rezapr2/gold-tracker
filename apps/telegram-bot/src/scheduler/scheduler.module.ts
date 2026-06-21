import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [TelegramModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
