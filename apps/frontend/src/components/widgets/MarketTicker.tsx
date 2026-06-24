'use client';
import { useEffect, useRef, useState } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { useLatestPrice } from '@/hooks/useGoldPrice';
import { AssetId, ASSETS, ASSET_META } from '@/lib/assets';
import { AssetBadge } from '@/components/ui/asset-badge';
import { cn, formatPrice, formatPercent } from '@/lib/utils';

/** One asset cell in the ticker — live price that flashes on every tick. */
function TickerItem({ asset }: { asset: AssetId }) {
  const { stats } = useLatestPrice(asset);
  const meta = ASSET_META[asset];
  const current = stats?.current;

  const prevRef = useRef<number | undefined>(current);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    if (current == null) return;
    const prev = prevRef.current;
    if (prev != null && current !== prev) {
      setFlash(current > prev ? 'up' : 'down');
      const t = setTimeout(() => setFlash(null), 700);
      prevRef.current = current;
      return () => clearTimeout(t);
    }
    prevRef.current = current;
  }, [current]);

  const change = stats?.day?.changePercent ?? 0;
  const up = change >= 0;

  return (
    <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
      <AssetBadge asset={asset} size="sm" />
      <span className="text-xs font-semibold text-muted-foreground">{meta.symbol}</span>
      {stats ? (
        <>
          <span
            className={cn(
              'text-sm font-bold text-foreground tabular-nums rounded px-1 -mx-0.5',
              flash === 'up' && 'animate-flash-up',
              flash === 'down' && 'animate-flash-down',
            )}
          >
            ${formatPrice(current ?? 0)}
          </span>
          <span
            className={cn(
              'flex items-center gap-0.5 text-xs font-medium tabular-nums',
              up ? 'text-emerald-500' : 'text-red-500',
            )}
          >
            {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {formatPercent(change)}
          </span>
        </>
      ) : (
        <span className="skeleton h-4 w-20 rounded" />
      )}
    </div>
  );
}

/**
 * Continuously scrolling strip of live asset prices. The track holds two
 * identical halves so the -50% marquee loops seamlessly; it pauses on hover so
 * users can read a quote, and freezes (readable) under prefers-reduced-motion.
 */
export function MarketTicker() {
  // Repeat the asset list so even a 2-asset board fills the width before looping.
  const repeat = Math.max(1, Math.ceil(8 / ASSETS.length));
  const half = Array.from({ length: repeat }).flatMap(() => ASSETS);

  return (
    <div className="relative border-b border-border bg-card/40 backdrop-blur-sm overflow-hidden">
      {/* Pinned "Markets" label with a fade so quotes slide out cleanly under it. */}
      <div className="absolute inset-y-0 left-0 z-10 flex items-center gap-1.5 pl-4 sm:pl-6 pr-10 bg-gradient-to-r from-background via-background/95 to-transparent">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Markets</span>
      </div>

      {/* Right edge fade for symmetry. */}
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-background to-transparent" />

      <div className="flex w-max items-center gap-8 py-2.5 pl-28 sm:pl-32 animate-marquee hover:[animation-play-state:paused]">
        {[0, 1].map((copy) =>
          half.map((asset, i) => <TickerItem key={`${copy}-${i}`} asset={asset} />),
        )}
      </div>
    </div>
  );
}
