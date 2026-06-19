import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { TelegramModule } from '../telegram/telegram.module';
import { SchedulerModule } from '../scheduler/scheduler.module';

@Module({
  // BotSettings model + SettingsStoreService come from the global
  // SettingsStoreModule registered in AppModule.
  imports: [TelegramModule, SchedulerModule],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
