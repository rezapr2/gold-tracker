import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { BotSettings, BotSettingsDocument } from './schemas/settings.schema';
import { TelegramService } from '../telegram/telegram.service';

@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @InjectModel(BotSettings.name) private settingsModel: Model<BotSettingsDocument>,
    private configService: ConfigService,
    private telegramService: TelegramService,
  ) {}

  async onModuleInit() {
    await this.ensureDefaultSettings();
  }

  private async ensureDefaultSettings() {
    const existing = await this.settingsModel.findOne({ key: 'default' });
    if (!existing) {
      await this.settingsModel.create({
        key: 'default',
        telegramBotToken: this.configService.get<string>('telegram.botToken'),
        telegramChannelId: this.configService.get<string>('telegram.channelId'),
        goldApiKey: this.configService.get<string>('apis.goldapi.key'),
        metalsDevKey: this.configService.get<string>('apis.metalsDev.key'),
        twelveDataKey: this.configService.get<string>('apis.twelveData.key'),
        alphaVantageKey: this.configService.get<string>('apis.alphaVantage.key'),
      });
      this.logger.log('Default settings created');
    }
  }

  async getSettings(): Promise<BotSettings> {
    return this.settingsModel.findOne({ key: 'default' }).lean().exec();
  }

  async updateSettings(updates: Partial<BotSettings>): Promise<BotSettings> {
    const settings = await this.settingsModel.findOneAndUpdate(
      { key: 'default' },
      { $set: updates },
      { new: true, upsert: true },
    );

    if (updates.telegramBotToken) {
      // Settings UI manages the gold bot; the silver bot is env-configured.
      this.telegramService.initializeBot('XAU', updates.telegramBotToken);
    }

    return settings;
  }
}
