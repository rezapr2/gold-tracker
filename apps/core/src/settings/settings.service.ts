import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { BotSettings, BotSettingsDocument, TelegramBotOverride } from './schemas/settings.schema';
import { ASSET_CODES, getAsset, SettingsResolver, BotSettingsData } from '@gold-tracker/shared';

/**
 * Core owns the `bot_settings` document. It persists writes and resolves the
 * values core itself needs (retention, alert threshold). Every other service
 * reads the raw doc via the `settings.get` RPC and applies the same env fallback
 * locally; after an update core emits `settings.changed` so they re-pull.
 */
@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name);
  private readonly resolver = new SettingsResolver(() => this.load());

  constructor(
    @InjectModel(BotSettings.name) private settingsModel: Model<BotSettingsDocument>,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.ensureDefaultSettings();
  }

  private load(): Promise<BotSettingsData | null> {
    return this.settingsModel.findOne({ key: 'default' }).lean<BotSettingsData>().exec();
  }

  private async ensureDefaultSettings() {
    const existing = await this.settingsModel.findOne({ key: 'default' });
    if (existing) return;
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
    this.resolver.invalidate();
    this.logger.log('Default settings created');
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

  /** Raw settings doc — served over RPC so remote resolvers can env-merge. */
  async getRaw(): Promise<BotSettingsData> {
    return (await this.load()) ?? { key: 'default' };
  }

  async update(updates: Partial<BotSettingsData>): Promise<BotSettingsData> {
    // `key` identifies the singleton document and must not be overwritten.
    const { key, ...safe } = updates as Record<string, unknown>;
    const doc = await this.settingsModel
      .findOneAndUpdate({ key: 'default' }, { $set: safe }, { new: true, upsert: true })
      .lean<BotSettingsData>()
      .exec();
    this.resolver.invalidate();
    return doc;
  }

  // ---- Values core consumes directly -----------------------------------
  alertThreshold(): Promise<number> {
    return this.resolver.alertThreshold();
  }
  dataRetentionDays(): Promise<number> {
    return this.resolver.dataRetentionDays();
  }
  priceFetchInterval(): Promise<string> {
    return this.resolver.priceFetchInterval();
  }
  isAssetEnabled(code: string): Promise<boolean> {
    return this.resolver.isAssetEnabled(code);
  }
}
