// Canonical asset model for everything the tracker quotes.
//
// "metal" is the legacy name for an asset id and is kept as a deprecated alias
// at the bottom of this file so existing imports keep working. New code should
// use the Asset* names. To add a new instrument (e.g. oil), add its id to
// `ASSETS` and a matching entry in `ASSET_META` — the UI fans out automatically.

export type AssetId = 'XAU' | 'XAG' | 'WTI' | 'BRENT';
export type AssetCategory = 'metal' | 'energy';

export const ASSETS: AssetId[] = ['XAU', 'XAG', 'WTI', 'BRENT'];

export const DEFAULT_ASSET: AssetId = 'XAU';

export interface AssetMeta {
  name: string;
  symbol: string;
  emoji: string;
  /** Tailwind text color for the badge/label. */
  accent: string;
  /** Hex line/area color used by charts. */
  chartColor: string;
  /** Unique SVG gradient id (charts share one page). */
  gradientId: string;
  /** Short element/ticker label shown inside the coin badge, e.g. "Au". */
  badgeLabel: string;
  /** Coin badge gradient stops (top highlight → bottom shade). */
  badgeFrom: string;
  badgeTo: string;
  category: AssetCategory;
  /** Pricing unit, e.g. troy ounce ("oz") or barrel ("bbl"). */
  unit: string;
  /** Human label for the unit, e.g. "per troy ounce". */
  unitLabel: string;
  /** Number of decimals to show for the price. */
  decimals: number;
}

export const ASSET_META: Record<AssetId, AssetMeta> = {
  XAU: {
    name: 'Gold',
    symbol: 'XAU/USD',
    emoji: '🥇',
    accent: 'text-gold-400',
    chartColor: '#f59e0b',
    gradientId: 'grad-xau',
    badgeLabel: 'Au',
    badgeFrom: '#fde68a',
    badgeTo: '#b45309',
    category: 'metal',
    unit: 'oz',
    unitLabel: 'per troy ounce',
    decimals: 2,
  },
  XAG: {
    name: 'Silver',
    symbol: 'XAG/USD',
    emoji: '🥈',
    accent: 'text-slate-300',
    chartColor: '#94a3b8',
    gradientId: 'grad-xag',
    badgeLabel: 'Ag',
    badgeFrom: '#f8fafc',
    badgeTo: '#64748b',
    category: 'metal',
    unit: 'oz',
    unitLabel: 'per troy ounce',
    decimals: 2,
  },
  WTI: {
    name: 'Crude Oil (WTI)',
    symbol: 'WTI/USD',
    emoji: '🛢️',
    accent: 'text-amber-700',
    chartColor: '#b45309',
    gradientId: 'grad-wti',
    badgeLabel: 'WTI',
    badgeFrom: '#a16207',
    badgeTo: '#451a03',
    category: 'energy',
    unit: 'bbl',
    unitLabel: 'per barrel',
    decimals: 2,
  },
  BRENT: {
    name: 'Crude Oil (Brent)',
    symbol: 'BRENT/USD',
    emoji: '🛢️',
    accent: 'text-stone-400',
    chartColor: '#57534e',
    gradientId: 'grad-brent',
    badgeLabel: 'BRT',
    badgeFrom: '#78716c',
    badgeTo: '#1c1917',
    category: 'energy',
    unit: 'bbl',
    unitLabel: 'per barrel',
    decimals: 2,
  },
};

export function isAsset(value: unknown): value is AssetId {
  return typeof value === 'string' && (ASSETS as string[]).includes(value);
}

/** The gold-silver ratio only applies when both metals are tracked. */
export const SHOW_GOLD_SILVER_RATIO =
  ASSETS.includes('XAU') && ASSETS.includes('XAG');

// ---------------------------------------------------------------------------
// Legacy aliases — deprecated, prefer the Asset* names above.
// ---------------------------------------------------------------------------
/** @deprecated use {@link AssetId} */
export type Metal = AssetId;
/** @deprecated use {@link AssetMeta} */
export type MetalMeta = AssetMeta;
/** @deprecated use {@link ASSETS} */
export const METALS = ASSETS;
/** @deprecated use {@link DEFAULT_ASSET} */
export const DEFAULT_METAL = DEFAULT_ASSET;
/** @deprecated use {@link ASSET_META} */
export const METAL_META = ASSET_META;
/** @deprecated use {@link isAsset} */
export const isMetal = isAsset;
