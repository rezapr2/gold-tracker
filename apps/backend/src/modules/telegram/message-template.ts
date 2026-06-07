import { format } from 'date-fns';
import { Metal, METAL_NAMES, METAL_EMOJIS } from '../gold-price/metal.types';

/**
 * Placeholders available in channel message templates. Use them as `{token}`,
 * e.g. "{emoji} {metalName}: ${price} ({dayChangePercent}%)".
 */
export const TEMPLATE_PLACEHOLDERS = [
  'metal',
  'metalName',
  'emoji',
  'symbol',
  'price',
  'dayChangePercent',
  'dayChange',
  'weekChangePercent',
  'high',
  'low',
  'open',
  'ratio',
  'time',
  'date',
] as const;

const num = (v: number | undefined, digits = 2) =>
  typeof v === 'number' && isFinite(v)
    ? v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
    : '—';

const signed = (v: number | undefined) =>
  typeof v === 'number' && isFinite(v) ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}` : '—';

/** Builds the substitution context for a metal from its stats (+ optional ratio). */
export function buildTemplateContext(
  metal: Metal,
  stats: any,
  ratio?: number | null,
): Record<string, string> {
  const now = new Date();
  return {
    metal,
    metalName: METAL_NAMES[metal],
    emoji: METAL_EMOJIS[metal],
    symbol: `${metal}/USD`,
    price: num(stats?.current),
    dayChangePercent: signed(stats?.day?.changePercent),
    dayChange: signed(stats?.day?.changeAmount),
    weekChangePercent: signed(stats?.week?.changePercent),
    high: num(stats?.day?.high),
    low: num(stats?.day?.low),
    open: num(stats?.day?.open),
    ratio: typeof ratio === 'number' ? ratio.toFixed(1) : '—',
    time: format(now, 'MMM dd, yyyy HH:mm'),
    date: format(now, 'EEEE, MMMM dd, yyyy'),
  };
}

/**
 * Renders a template by replacing `{token}` with context values. Unknown tokens
 * are left untouched so authors notice typos rather than getting silent blanks.
 */
export function renderTemplate(template: string, context: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(context, key) ? context[key] : match,
  );
}
