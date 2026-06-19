import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { BotSettings, BotSettingsDocument, TelegramBotOverride } from './schemas/settings.schema';
import { SettingsStoreService } from './settings-store.service';
import { TelegramService } from '../telegram/telegram.service';
import { SchedulerService } from '../scheduler/scheduler.service';
import { ASSET_CODES, getAsset } from '../gold-price/asset.types';

@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @InjectModel(BotSettings.name) private settingsModel: Model<BotSettingsDocument>,
    private configService: ConfigService,
    private settingsStore: SettingsStoreService,
    private telegramService: TelegramService,
    private schedulerService: SchedulerService,
  ) {}

  async onModuleInit() {
    await this.ensureDefaultSettings();
  }

  private async ensureDefaultSettings() {
    const existing = await this.settingsModel.findOne({ key: 'default' });
    if (!existing) {
      await this.settingsModel.create({
        key: 'default',
        telegramBots: this.seedTelegramBots(),
        telegramSendCharts: this.configService.get<boolean>('telegram.sendCharts') !== false,
        telegramCommandsEnabled: this.configService.get<boolean>('telegram.commandsEnabled') === true,
        goldApiKey: this.configService.get<string>('apis.goldapi.key'),
        metalsDevKey: this.configService.get<string>('apis.metalsDev.key'),
        twelveDataKey: this.configService.get<string>('apis.twelveData.key'),
        alphaVantageKey: this.configService.get<string>('apis.alphaVantage.key'),
      });
      this.settingsStore.invalidate();
      this.logger.log('Default settings created');
    }
  }

  /** Seeds the per-asset bot map from each asset's env vars in the registry. */
  private seedTelegramBots(): Record<string, TelegramBotOverride> {
    const bots: Record<string, TelegramBotOverride> = {};
    for (const code of ASSET_CODES) {
      const def = getAsset(code);
      if (!def.telegram) continue;
      const token = process.env[def.telegram.tokenEnv] || undefined;
      const channelId = process.env[def.telegram.channelEnv] || undefined;
      if (token || channelId) bots[code] = { token, channelId };
    }
    return bots;
  }

  async getSettings(): Promise<BotSettings> {
    return this.settingsModel.findOne({ key: 'default' }).lean().exec();
  }

  async updateSettings(updates: Partial<BotSettings>): Promise<BotSettings> {
    // `key` identifies the singleton document and must not be overwritten.
    const { key, ...safeUpdates } = updates as Record<string, unknown>;

    const settings = await this.settingsModel.findOneAndUpdate(
      { key: 'default' },
      { $set: safeUpdates },
      { new: true, upsert: true },
    );

    // Apply the new values immediately so the admin doesn't need a restart:
    // refresh the cache, then re-init the Telegram bots and reschedule crons.
    this.settingsStore.invalidate();
    await this.telegramService.reinitializeBots();
    await this.schedulerService.applySchedule();

    return settings;
  }
}
