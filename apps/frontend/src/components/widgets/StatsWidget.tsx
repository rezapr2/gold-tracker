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
      <div className="bg-card border border-border rounded-2xl p-5 animate-pulse">
        <div className="h-3 bg-muted rounded w-20 mb-4" />
        <div className="h-7 bg-muted rounded w-28 mb-2" />
        <div className="h-3 bg-muted rounded w-16" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5 hover:border-gold-500/30 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </p>
        <div className={cn('w-8 h-8 rounded-lg bg-secondary flex items-center justify-center', `${iconColor}/10`)}>
          <Icon className={cn('w-4 h-4', iconColor)} />
        </div>
      </div>

      <p className="text-2xl font-bold text-foreground mb-1">{value}</p>

      {(subtitle || change !== undefined) && (
        <div className="flex items-center gap-2">
          {change !== undefined && (
            <span
              className={cn(
                'text-xs font-medium',
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
