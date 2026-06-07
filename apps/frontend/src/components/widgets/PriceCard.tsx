'use client';
import { TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import { cn, formatPrice, formatPercent, formatChange } from '@/lib/utils';
import { PriceStats } from '@/types';
import { Metal, METAL_META, DEFAULT_METAL } from '@/lib/metals';
import { format } from 'date-fns';

interface PriceCardProps {
  stats: PriceStats | null;
  loading?: boolean;
  onRefresh?: () => void;
  metal?: Metal;
}

export function PriceCard({ stats, loading, onRefresh, metal = DEFAULT_METAL }: PriceCardProps) {
  const meta = METAL_META[metal];
  const dayChange = stats?.day?.changePercent ?? 0;
  const isUp = dayChange > 0;
  const isDown = dayChange < 0;

  if (loading || !stats) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 animate-pulse">
        <div className="h-4 bg-muted rounded w-24 mb-4" />
        <div className="h-10 bg-muted rounded w-48 mb-3" />
        <div className="h-4 bg-muted rounded w-32" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden">
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

        <div className="mb-5">
          <span className="text-4xl font-bold text-foreground tracking-tight">
            ${formatPrice(stats.current)}
          </span>
          <span
            className={cn(
              'text-sm font-medium ml-3',
              isUp ? 'text-emerald-500' : isDown ? 'text-red-500' : 'text-muted-foreground',
            )}
          >
            {formatChange(stats.day?.changeAmount ?? 0)}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
          <div>
            <p className="text-xs text-muted-foreground mb-1">24H High</p>
            <p className="text-sm font-semibold text-foreground">
              ${formatPrice(stats.day?.high)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">24H Low</p>
            <p className="text-sm font-semibold text-foreground">
              ${formatPrice(stats.day?.low)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">7D Change</p>
            <p
              className={cn(
                'text-sm font-semibold',
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
