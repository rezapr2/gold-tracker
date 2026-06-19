'use client';
import { useEffect, useRef, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import { cn, formatPrice, formatPercent, formatChange } from '@/lib/utils';
import { PriceStats } from '@/types';
import { AssetId, ASSET_META, DEFAULT_ASSET } from '@/lib/assets';
import { format } from 'date-fns';

interface PriceCardProps {
  stats: PriceStats | null;
  loading?: boolean;
  onRefresh?: () => void;
  metal?: AssetId;
}

export function PriceCard({ stats, loading, onRefresh, metal = DEFAULT_ASSET }: PriceCardProps) {
  const meta = ASSET_META[metal];
  const dayChange = stats?.day?.changePercent ?? 0;
  const isUp = dayChange > 0;
  const isDown = dayChange < 0;

  // Briefly flash the price green/red whenever the live value ticks.
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

  if (loading || !stats) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="skeleton h-4 rounded w-24 mb-4" />
        <div className="skeleton h-10 rounded w-48 mb-3" />
        <div className="skeleton h-4 rounded w-32" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden transition-colors hover:border-gold-500/30">
      <div className="absolute inset-0 bg-gradient-to-br from-gold-500/5 to-transparent pointer-events-none" />

      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {meta.emoji} {meta.symbol} — {meta.name} Spot
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {stats.timestamp ? format(new Date(stats.timestamp), 'MMM dd, HH:mm') : '—'} UTC
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold',
                isUp && 'bg-emerald-500/10 text-emerald-500',
                isDown && 'bg-red-500/10 text-red-500',
                !isUp && !isDown && 'bg-muted text-muted-foreground',
              )}
            >
              {isUp ? (
                <TrendingUp className="w-3 h-3" />
              ) : isDown ? (
                <TrendingDown className="w-3 h-3" />
              ) : (
                <Minus className="w-3 h-3" />
              )}
              {formatPercent(dayChange)}
            </div>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        <div className="mb-5 flex items-baseline gap-3">
          <span
            className={cn(
              'inline-flex items-baseline text-4xl font-bold text-foreground tracking-tight tabular-nums rounded-lg px-1 -mx-1',
              flash === 'up' && 'animate-flash-up',
              flash === 'down' && 'animate-flash-down',
            )}
          >
            ${formatPrice(stats.current, meta.decimals)}
            <span className="text-base font-medium text-muted-foreground ml-1">/{meta.unit}</span>
          </span>
          <span
            className={cn(
              'text-sm font-medium tabular-nums',
              isUp ? 'text-emerald-500' : isDown ? 'text-red-500' : 'text-muted-foreground',
            )}
          >
            {formatChange(stats.day?.changeAmount ?? 0)}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
          <div>
            <p className="text-xs text-muted-foreground mb-1">24H High</p>
            <p className="text-sm font-semibold text-foreground tabular-nums">
              ${formatPrice(stats.day?.high)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">24H Low</p>
            <p className="text-sm font-semibold text-foreground tabular-nums">
              ${formatPrice(stats.day?.low)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">7D Change</p>
            <p
              className={cn(
                'text-sm font-semibold tabular-nums',
                (stats.week?.changePercent ?? 0) >= 0 ? 'text-emerald-500' : 'text-red-500',
              )}
            >
              {formatPercent(stats.week?.changePercent ?? 0)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
