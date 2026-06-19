'use client';
import { cn, formatPrice, formatPercent } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatsWidgetProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  icon: LucideIcon;
  iconColor?: string;
  loading?: boolean;
}

export function StatsWidget({
  title,
  value,
  subtitle,
  change,
  icon: Icon,
  iconColor = 'text-gold-400',
  loading = false,
}: StatsWidgetProps) {
  if (loading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="skeleton h-3 rounded w-20 mb-4" />
        <div className="skeleton h-7 rounded w-28 mb-2" />
        <div className="skeleton h-3 rounded w-16" />
      </div>
    );
  }

  return (
    <div className="group bg-card border border-border rounded-2xl p-5 transition-all duration-200 hover:border-gold-500/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </p>
        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center transition-transform group-hover:scale-110">
          <Icon className={cn('w-4 h-4', iconColor)} />
        </div>
      </div>

      <p className="text-2xl font-bold text-foreground mb-1 tabular-nums">{value}</p>

      {(subtitle || change !== undefined) && (
        <div className="flex items-center gap-2">
          {change !== undefined && (
            <span
              className={cn(
                'text-xs font-medium tabular-nums',
                change >= 0 ? 'text-emerald-500' : 'text-red-500',
              )}
            >
              {formatPercent(change)}
            </span>
          )}
          {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
