/** Supported precious metals (ISO 4217 metal codes). */
export type Metal = 'XAU' | 'XAG';

export const METALS: Metal[] = ['XAU', 'XAG'];

/** Default metal — keeps existing gold-only behaviour for callers that omit it. */
export const DEFAULT_METAL: Metal = 'XAU';

export const METAL_NAMES: Record<Metal, string> = {
  XAU: 'Gold',
  XAG: 'Silver',
};

export const METAL_EMOJIS: Record<Metal, string> = {
  XAU: '🥇',
  XAG: '🥈',
};

export function isMetal(value: unknown): value is Metal {
  return value === 'XAU' || value === 'XAG';
}

/** Normalises arbitrary input (e.g. query params) to a valid Metal. */
export function toMetal(value: unknown): Metal {
  return isMetal(value) ? value : DEFAULT_METAL;
}
