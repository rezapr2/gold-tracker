import { Asset, getAsset } from '../assets/asset.types';

/** Plain shape of the persisted `bot_settings` doc (framework-agnostic). */
export interface BotSettingsData {
  key?: string;
  telegramBots?: Record<string, { token?: string; channelId?: string }>;
  telegramSendCharts?: boolean;
  telegramCommandsEnabled?: boolean;
  priceFetchInterval?: string;
  telegramPublishInterval?: string;
  priceAlertThreshold?: number;
  telegramEnabled?: boolean;
  alertsEnabled?: boolean;
  language?: string;
  goldApiKey?: string;
  metalsDevKey?: string;
  twelveDataKey?: string;
  alphaVantageKey?: string;
  dataRetentionDays?: number;
}

export type ApiProvider = 'goldapi' | 'metalsDev' | 'twelveData' | 'alphaVantage';

/** Env var that backs each provider key when the admin hasn't set a DB value. */
const PROVIDER_ENV: Record<ApiProvider, string> = {
  goldapi: 'GOLDAPI_KEY',
  metalsDev: 'METALS_DEV_KEY',
  twelveData: 'TWELVE_DATA_KEY',
  alphaVantage: 'ALPHA_VANTAGE_KEY',
};

const DOC_KEY = { goldapi: 'goldApiKey', metalsDev: 'metalsDevKey', twelveData: 'twelveDataKey', alphaVantage: 'alphaVantageKey' } as const;

export function firstNonEmpty(...values: (string | undefined | null)[]): string {
  for (const v of values) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

/**
 * Resolves runtime settings with identical DB⊕env precedence everywhere: the
 * admin-set DB value wins, else the env fallback. The DB doc is supplied by a
 * `loader` (Mongo query in core, RPC to core in every other service) and cached
 * briefly; {@link invalidate} drops the cache after a write / on settings.changed.
 *
 * Env fallbacks read `process.env` directly so the same resolver works in every
 * container without depending on a service-specific ConfigService layout.
 */
export class SettingsResolver {
  private cache: BotSettingsData | null = null;
  private expiresAt = 0;

  constructor(
    private readonly loader: () => Promise<BotSettingsData | null>,
    private readonly ttlMs = 15_000,
  ) {}

  async get(): Promise<BotSettingsData | null> {
    if (this.cache && Date.now() < this.expiresAt) return this.cache;
    try {
      this.cache = await this.loader();
      this.expiresAt = Date.now() + this.ttlMs;
    } catch {
      // Keep last-known value; fall back to env-only if we never loaded.
    }
    return this.cache;
  }

  invalidate(): void {
    this.cache = null;
    this.expiresAt = 0;
  }

  async apiKey(provider: ApiProvider): Promise<string> {
    const s = await this.get();
    return firstNonEmpty(s?.[DOC_KEY[provider]] as string | undefined, process.env[PROVIDER_ENV[provider]]);
  }

  async telegram(asset: Asset): Promise<{ token: string; channelId: string }> {
    const s = await this.get();
    const override = s?.telegramBots?.[asset] ?? {};
    const def = getAsset(asset);
    return {
      token: firstNonEmpty(override.token, def.telegram?.tokenEnv ? process.env[def.telegram.tokenEnv] : undefined),
      channelId: firstNonEmpty(override.channelId, def.telegram?.channelEnv ? process.env[def.telegram.channelEnv] : undefined),
    };
  }

  async sendCharts(): Promise<boolean> {
    const s = await this.get();
    if (typeof s?.telegramSendCharts === 'boolean') return s.telegramSendCharts;
    return process.env.TELEGRAM_SEND_CHARTS !== 'false';
  }

  async commandsEnabled(): Promise<boolean> {
    const s = await this.get();
    if (typeof s?.telegramCommandsEnabled === 'boolean') return s.telegramCommandsEnabled;
    return process.env.TELEGRAM_COMMANDS_ENABLED === 'true';
  }

  async alertThreshold(): Promise<number> {
    const s = await this.get();
    return s?.priceAlertThreshold ?? Number(process.env.PRICE_ALERT_THRESHOLD) ?? 1.5;
  }

  async priceFetchInterval(): Promise<string> {
    const s = await this.get();
    return firstNonEmpty(s?.priceFetchInterval, process.env.PRICE_FETCH_INTERVAL, '*/1 * * * *');
  }

  async dataRetentionDays(): Promise<number> {
    const s = await this.get();
    return s?.dataRetentionDays ?? 90;
  }
}
