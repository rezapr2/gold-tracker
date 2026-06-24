'use client';
import { useId } from 'react';
import { cn } from '@/lib/utils';
import { AssetId, ASSET_META } from '@/lib/assets';

const SIZES = {
  sm: { box: 22, font: 'text-[9px]' },
  md: { box: 36, font: 'text-[11px]' },
  lg: { box: 46, font: 'text-sm' },
} as const;

interface AssetBadgeProps {
  asset: AssetId;
  size?: keyof typeof SIZES;
  className?: string;
}

/**
 * Circular "coin" badge for an asset — a metal-tinted gradient disc stamped with
 * the element symbol (Au, Ag). Replaces emoji medals so every price surface
 * renders crisply at any size and stays theme-consistent. Decorative: the asset
 * name/symbol is always shown as adjacent text, so this is aria-hidden.
 */
export function AssetBadge({ asset, size = 'md', className }: AssetBadgeProps) {
  const meta = ASSET_META[asset];
  const { box, font } = SIZES[size];
  const gid = useId();

  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-full',
        'shadow-[0_1px_3px_rgba(0,0,0,0.35)] ring-1 ring-black/10',
        className,
      )}
      style={{ width: box, height: box }}
      aria-hidden="true"
    >
      <svg
        width={box}
        height={box}
        viewBox="0 0 40 40"
        className="absolute inset-0"
        role="presentation"
      >
        <defs>
          <radialGradient id={`coin-${gid}`} cx="34%" cy="26%" r="78%">
            <stop offset="0%" stopColor={meta.badgeFrom} />
            <stop offset="100%" stopColor={meta.badgeTo} />
          </radialGradient>
        </defs>
        {/* milled rim */}
        <circle cx="20" cy="20" r="19" fill={meta.badgeTo} />
        {/* coin face */}
        <circle cx="20" cy="20" r="16.5" fill={`url(#coin-${gid})`} />
        {/* top-left sheen */}
        <ellipse cx="15" cy="13" rx="9" ry="5" fill="#ffffff" opacity="0.28" />
      </svg>
      <span className={cn('relative select-none font-bold tracking-tight text-slate-900/80', font)}>
        {meta.badgeLabel}
      </span>
    </span>
  );
}
