export type Metal = 'XAU' | 'XAG';

export const METALS: Metal[] = ['XAU', 'XAG'];

export const DEFAULT_METAL: Metal = 'XAU';

export interface MetalMeta {
  name: string;
  symbol: string;
  emoji: string;
  /** Tailwind text color for the badge/label. */
  accent: string;
  /** Hex line/area color used by charts. */
  chartColor: string;
  /** Unique SVG gradient id (two charts share one page). */
  gradientId: string;
}

export const METAL_META: Record<Metal, MetalMeta> = {
  XAU: {
    name: 'Gold',
    symbol: 'XAU/USD',
    emoji: '🥇',
    accent: 'text-gold-400',
    chartColor: '#f59e0b',
    gradientId: 'grad-xau',
  },
  XAG: {
    name: 'Silver',
    symbol: 'XAG/USD',
    emoji: '🥈',
    accent: 'text-slate-300',
    chartColor: '#94a3b8',
    gradientId: 'grad-xag',
  },
};

export function isMetal(value: unknown): value is Metal {
  return value === 'XAU' || value === 'XAG';
}
