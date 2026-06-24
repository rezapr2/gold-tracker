'use client';
import { useEffect, useRef, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import { cn, formatPrice, formatPercent, formatChange } from '@/lib/utils';
import { PriceStats } from '@/types';
import { AssetId, ASSET_META, DEFAULT_ASSET } from '@/lib/assets';
import { AssetBadge } from '@/components/ui/asset-badge';
import { Sparkline } from '@/components/ui/sparkline';
import { format } from 'date-fns';

interface PriceCardProps {
  stats: PriceStats | null;
  loading?: boolean;
  onRefresh?: () => void;
  metal?: AssetId;
  /** Optional 24h price series for an inline trend line. */
  sparkline?: number[];
}

export function PriceCard({
  stats,
  loading,
  onRefresh,
  metal = DEFAULT_ASSET,
  sparkline,
}: PriceCardProps) {
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
      <div className="bg-card border border-border rounded-2xl p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="skeleton h-9 w-9 rounded-full" />
          <div className="space-y-2">
            <div className="skeleton h-3.5 rounded w-24" />
            <div className="skeleton h-3 rounded w-16" />
          </div>
        </div>
        <div className="skeleton h-10 rounded w-48 mb-3" />
        <div className="skeleton h-4 rounded w-32" />
      </div>
    );
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 sm:p-6 transition-colors hover:border-gold-500/30">
      {/* Per-asset color cues: a hairline top accent and a soft corner glow. */}
      <div
        className="absolute inset-x-0 top-0 h-px opacity-70"
        style={{ background: `linear-gradient(90deg, transparent, ${meta.chartColor}, transparent)` }}
      />
      <div
        className="pointer-events-none absolute -top-20 -right-12 h-44 w-44 rounded-full blur-3xl opacity-[0.08] transition-opacity duration-300 group-hover:opacity-[0.14]"
        style={{ backgroundColor: meta.chartColor }}
      />

      <div className="relative">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <AssetBadge asset={metal} size="md" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground leading-tight truncate">
                {meta.name}
                <span className="ml-1.5 text-xs font-medium text-muted-foreground">{meta.symbol}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Spot · {stats.timestamp ? format(new Date(stats.timestamp), 'MMM dd, HH:mm') : '—'} UTC
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold tabular-nums',
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
                aria-label="Refresh price"
              >
                <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span
            className={cn(
              'inline-flex items-baseline text-3xl sm:text-4xl font-bold text-foreground tracking-tight tabular-nums rounded-lg px-1 -mx-1',
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

        {/* Inline 24h trend — only rendered when the caller supplies a series. */}
        {sparkline && sparkline.length > 1 && (
          <div className="mt-4 h-12 w-full">
            <Sparkline
              data={sparkline}
              color={isDown ? '#ef4444' : isUp ? '#10b981' : meta.chartColor}
              className="h-full w-full"
            />
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-5 pt-4 border-t border-border">
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
