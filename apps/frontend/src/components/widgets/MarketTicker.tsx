'use client';
import { useEffect, useRef, useState } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { useLatestPrice } from '@/hooks/useGoldPrice';
import { AssetId, ASSETS, ASSET_META } from '@/lib/assets';
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
      <span className="text-sm">{meta.emoji}</span>
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

/** Horizontal strip of live asset prices. Auto-expands with the assets list. */
export function MarketTicker() {
  return (
    <div className="border-b border-border bg-card/40 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto flex items-center gap-4 sm:gap-6 overflow-x-auto px-4 sm:px-6 py-2.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground whitespace-nowrap shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Markets
        </span>
        {ASSETS.map((asset) => (
          <TickerItem key={asset} asset={asset} />
        ))}
      </div>
    </div>
  );
}
