/**
 * Asset registry — the single source of truth for every tracked instrument.
 *
 * Adding a new asset (e.g. crude oil) is a one-entry change here: declare its
 * category, display metadata, which price providers can serve it, and its
 * per-asset Telegram bot env vars. The scheduler, provider failover, API,
 * analytics and Telegram bots all iterate this registry, so no other code needs
 * to change to start tracking a new asset.
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

// ---------------------------------------------------------------------------
// Legacy aliases — deprecated, prefer the Asset* names above. Kept so existing
// `metal.types` imports keep working during the incremental rename (mirrors the
// frontend's metals.ts → assets.ts shim).
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
