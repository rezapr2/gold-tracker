/**
 * Asset registry — the single source of truth for every tracked instrument.
 *
 * Promoted to @gold-tracker/shared so every service (fetchers, core, web-api,
 * telegram-bot) shares one definition. Adding a new asset is a one-entry change
 * here: declare its category, display metadata, which price providers can serve
 * it, and its per-asset Telegram bot env vars.
 */

export type AssetCategory = 'metal' | 'energy' | 'crypto' | 'forex';

export interface AssetDef {
  /** Canonical code, used as the DB `asset` value and default symbol base. */
  code: string;
  /** Human-friendly name, e.g. "Gold". */
  name: string;
  category: AssetCategory;
  emoji: string;
  /** Pricing unit, e.g. "oz" for metals, "barrel" for oil. */
  unit: string;
  /** Quote currency, e.g. "USD". */
  quoteCurrency: string;
  /** Provider names (see provider `name`s) able to serve this asset. */
  providers: string[];
  /**
   * Per-provider symbol overrides. Defaults to `${code}/${quoteCurrency}`.
   * e.g. oil on Twelve Data → { twelvedata: 'WTI/USD' }.
   */
  providerSymbols?: Record<string, string>;
  /** Env var names for this asset's dedicated Telegram bot (optional). */
  telegram?: { tokenEnv: string; channelEnv: string };
  /** Interactive Telegram command alias, e.g. "gold" → /gold. */
  command?: string;
}

export const ASSETS: Record<string, AssetDef> = {
  XAU: {
    code: 'XAU',
    name: 'Gold',
    category: 'metal',
    emoji: '🥇',
    unit: 'oz',
    quoteCurrency: 'USD',
    providers: ['goldapicom', 'goldapi', 'metalsdev', 'twelvedata', 'alphavantage'],
    telegram: { tokenEnv: 'TELEGRAM_BOT_TOKEN', channelEnv: 'TELEGRAM_CHANNEL_ID' },
    command: 'gold',
  },
  XAG: {
    code: 'XAG',
    name: 'Silver',
    category: 'metal',
    emoji: '🥈',
    unit: 'oz',
    quoteCurrency: 'USD',
    providers: ['goldapicom', 'goldapi', 'metalsdev', 'twelvedata', 'alphavantage'],
    telegram: { tokenEnv: 'TELEGRAM_SILVER_BOT_TOKEN', channelEnv: 'TELEGRAM_SILVER_CHANNEL_ID' },
    command: 'silver',
  },

  // ---------------------------------------------------------------------------
  // Iranian gold & coin market, scraped from the Tehran Gold & Jewelry Union
  // (estjt.ir). All quoted in Toman. `providerSymbols.estjt` is the exact Persian
  // row label the scraper matches on (digit form / Arabic-vs-Persian letters are
  // normalised by the provider, so ASCII digits here are fine). These are served
  // only by 'estjt' — the USD metal APIs declare no support for them.
  // ---------------------------------------------------------------------------
  IR_COIN_EMAMI: {
    code: 'IR_COIN_EMAMI',
    name: 'Emami Coin (New Design)',
    category: 'metal',
    emoji: '🪙',
    unit: 'coin',
    quoteCurrency: 'TOMAN',
    providers: ['estjt'],
    providerSymbols: { estjt: 'سکه طرح جدید' },
  },
  IR_COIN_BAHAR: {
    code: 'IR_COIN_BAHAR',
    name: 'Bahar Azadi Coin (Old Design)',
    category: 'metal',
    emoji: '🪙',
    unit: 'coin',
    quoteCurrency: 'TOMAN',
    providers: ['estjt'],
    providerSymbols: { estjt: 'سکه طرح قدیم' },
  },
  IR_COIN_HALF: {
    code: 'IR_COIN_HALF',
    name: 'Half Coin',
    category: 'metal',
    emoji: '🪙',
    unit: 'coin',
    quoteCurrency: 'TOMAN',
    providers: ['estjt'],
    providerSymbols: { estjt: 'نیم سکه' },
  },
  IR_COIN_QUARTER: {
    code: 'IR_COIN_QUARTER',
    name: 'Quarter Coin',
    category: 'metal',
    emoji: '🪙',
    unit: 'coin',
    quoteCurrency: 'TOMAN',
    providers: ['estjt'],
    providerSymbols: { estjt: 'ربع سکه' },
  },
  IR_MAZANEH: {
    code: 'IR_MAZANEH',
    name: 'Tehran Mazaneh',
    category: 'metal',
    emoji: '⚖️',
    unit: 'mesghal',
    quoteCurrency: 'TOMAN',
    providers: ['estjt'],
    providerSymbols: { estjt: 'مظنه تهران' },
  },
  IR_GOLD_18K: {
    code: 'IR_GOLD_18K',
    name: 'Gold 18K (gram)',
    category: 'metal',
    emoji: '🥇',
    unit: 'gram',
    quoteCurrency: 'TOMAN',
    providers: ['estjt'],
    providerSymbols: { estjt: 'طلا 18 عیار' },
  },
  IR_GOLD_24K: {
    code: 'IR_GOLD_24K',
    name: 'Gold 24K (gram)',
    category: 'metal',
    emoji: '🥇',
    unit: 'gram',
    quoteCurrency: 'TOMAN',
    providers: ['estjt'],
    providerSymbols: { estjt: 'طلا 24 عیار' },
  },
};

/** A tracked asset code. Validated against the registry at the edges. */
export type Asset = string;

export const ASSET_CODES: Asset[] = Object.keys(ASSETS);

/** Default asset — keeps existing gold-only behaviour for callers that omit it. */
export const DEFAULT_ASSET: Asset = 'XAU';

export function isAsset(value: unknown): value is Asset {
  return typeof value === 'string' && value in ASSETS;
}

/** Normalises arbitrary input (e.g. query params) to a valid asset code. */
export function toAsset(value: unknown): Asset {
  return isAsset(value) ? value : DEFAULT_ASSET;
}

/** Looks up an asset definition, falling back to the default. */
export function getAsset(asset: Asset): AssetDef {
  return ASSETS[asset] ?? ASSETS[DEFAULT_ASSET];
}

/** Resolves the API symbol a given provider should request for an asset. */
export function symbolFor(asset: Asset, provider: string): string {
  const def = getAsset(asset);
  return def.providerSymbols?.[provider] ?? `${def.code}/${def.quoteCurrency}`;
}

/** True when every metal needed for the gold/silver ratio is tracked. */
export function hasMetalPair(): boolean {
  return isAsset('XAU') && isAsset('XAG');
}

/** Asset codes a given provider can serve (its `providers` list contains it). */
export function assetsForProvider(provider: string): Asset[] {
  return ASSET_CODES.filter((code) => ASSETS[code].providers.includes(provider));
}

// ---------------------------------------------------------------------------
// Legacy aliases — deprecated, prefer the Asset* names above.
// ---------------------------------------------------------------------------
/** @deprecated use {@link Asset} */
export type Metal = Asset;
/** @deprecated use {@link ASSET_CODES} */
export const METALS = ASSET_CODES;
/** @deprecated use {@link DEFAULT_ASSET} */
export const DEFAULT_METAL = DEFAULT_ASSET;
/** @deprecated use {@link isAsset} */
export const isMetal = isAsset;
/** @deprecated use {@link toAsset} */
export const toMetal = toAsset;
/** @deprecated use `getAsset(code).name` */
export const METAL_NAMES: Record<string, string> = Object.fromEntries(
  ASSET_CODES.map((code) => [code, ASSETS[code].name]),
);
/** @deprecated use `getAsset(code).emoji` */
export const METAL_EMOJIS: Record<string, string> = Object.fromEntries(
  ASSET_CODES.map((code) => [code, ASSETS[code].emoji]),
);
