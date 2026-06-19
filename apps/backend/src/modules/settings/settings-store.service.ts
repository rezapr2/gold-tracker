import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { BotSettings, BotSettingsDocument } from './schemas/settings.schema';
import { Asset, getAsset } from '../gold-price/asset.types';

type ApiProvider = 'goldapi' | 'metalsDev' | 'twelveData' | 'alphaVantage';

/**
 * Single source of truth for runtime configuration.
 *
 * Values entered in the admin panel are persisted to the `bot_settings`
 * document and resolved here, falling back to environment (ConfigService)
 * whenever a DB value is empty. Consumers (price providers, Telegram bot,
 * scheduler) read through this service instead of `ConfigService` directly so
 * that changes saved in the admin panel take effect without a restart.
 *
 * The document is tiny and queried often (every price fetch), so reads are
 * cached briefly; {@link invalidate} is called after every write.
 */
@Injectable()
export class SettingsStoreService {
  private readonly logger = new Logger(SettingsStoreService.name);
  private cache: BotSettings | null = null;
  private expiresAt = 0;
  private readonly ttlMs = 15_000;

  constructor(
    @InjectModel(BotSettings.name) private readonly settingsModel: Model<BotSettingsDocument>,
    private readonly config: ConfigService,
  ) {}

  /** Persisted settings doc, cached for a few seconds. */
  async get(): Promise<BotSettings | null> {
    if (this.cache && Date.now() < this.expiresAt) return this.cache;
    try {
      this.cache = await this.settingsModel.findOne({ key: 'default' }).lean<BotSettings>().exec();
      this.expiresAt = Date.now() + this.ttlMs;
    } catch (error) {
      this.logger.warn(`Failed to load settings, falling back to env: ${error.message}`);
    }
    return this.cache;
  }

  /** Drops the cache so the next read reflects the latest write. */
  invalidate(): void {
    this.cache = null;
    this.expiresAt = 0;
  }

  /** Resolved API key for a price provider: DB value first, env fallback. */
  async apiKey(provider: ApiProvider): Promise<string> {
    const s = await this.get();
    const dbValue = {
      goldapi: s?.goldApiKey,
      metalsDev: s?.metalsDevKey,
      twelveData: s?.twelveDataKey,
      alphaVantage: s?.alphaVantageKey,
    }[provider];
    return this.firstNonEmpty(dbValue, this.config.get<string>(`apis.${provider}.key`));
  }

  /**
   * Resolved Telegram bot token + channel for an asset. The admin override
   * (per-asset map) wins; otherwise it falls back to the env vars declared for
   * that asset in the registry, so adding an asset needs no code change here.
   */
  async telegram(asset: Asset): Promise<{ token: string; channelId: string }> {
    const s = await this.get();
    const override = s?.telegramBots?.[asset] ?? {};
    const def = getAsset(asset);
    const envToken = def.telegram?.tokenEnv ? process.env[def.telegram.tokenEnv] : undefined;
    const envChannel = def.telegram?.channelEnv ? process.env[def.telegram.channelEnv] : undefined;
    return {
      token: this.firstNonEmpty(override.token, envToken),
      channelId: this.firstNonEmpty(override.channelId, envChannel),
    };
  }

  /** Whether scheduled updates attach a trend chart. DB value first, env fallback. */
  async sendCharts(): Promise<boolean> {
    const s = await this.get();
    if (typeof s?.telegramSendCharts === 'boolean') return s.telegramSendCharts;
    return this.config.get<boolean>('telegram.sendCharts') !== false;
  }

  /** Whether interactive bot commands (/gold, /silver, /ratio) are answered. */
  async commandsEnabled(): Promise<boolean> {
    const s = await this.get();
    if (typeof s?.telegramCommandsEnabled === 'boolean') return s.telegramCommandsEnabled;
    return this.config.get<boolean>('telegram.commandsEnabled') === true;
  }

  /** Percent move that triggers a price alert. */
  async alertThreshold(): Promise<number> {
    const s = await this.get();
    return s?.priceAlertThreshold ?? this.config.get<number>('alerts.priceChangeThreshold') ?? 1.5;
  }

  /** Cron expression for the price-fetch job. */
  async priceFetchInterval(): Promise<string> {
    const s = await this.get();
    return this.firstNonEmpty(s?.priceFetchInterval, this.config.get<string>('scheduler.priceFetchInterval'), '*/1 * * * *');
  }

  /** Days of minute-level data to retain before cleanup. */
  async dataRetentionDays(): Promise<number> {
    const s = await this.get();
    return s?.dataRetentionDays ?? 90;
  }

  private firstNonEmpty(...values: (string | undefined | null)[]): string {
    for (const v of values) {
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return '';
  }
}
