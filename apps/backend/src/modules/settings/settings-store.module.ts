import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BotSettings, BotSettingsSchema } from './schemas/settings.schema';
import { SettingsStoreService } from './settings-store.service';

/**
 * Global provider of {@link SettingsStoreService} and the BotSettings model so
 * that any module (price providers, Telegram, scheduler) can resolve runtime
 * config without creating circular module dependencies.
 */
@Global()
@Module({
  imports: [MongooseModule.forFeature([{ name: BotSettings.name, schema: BotSettingsSchema }])],
  providers: [SettingsStoreService],
  exports: [SettingsStoreService, MongooseModule],
})
export class SettingsStoreModule {}
