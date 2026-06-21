import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SettingsService } from './settings.service';
import { BotSettings, BotSettingsSchema } from './schemas/settings.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: BotSettings.name, schema: BotSettingsSchema }])],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
