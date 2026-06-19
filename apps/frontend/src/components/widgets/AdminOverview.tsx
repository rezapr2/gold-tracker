'use client';
import { useEffect, useState } from 'react';
import { Activity, Bot, CheckCircle2, Scale, Send, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useGoldSilverRatio, useLatestPrice } from '@/hooks/useGoldPrice';
import { telegramApi } from '@/lib/api';
import { TelegramStatus } from '@/types';
import { AssetId, ASSETS, ASSET_META, SHOW_GOLD_SILVER_RATIO } from '@/lib/assets';
import { cn, formatPrice, formatPercent } from '@/lib/utils';

/** Compact live price KPI for one asset. */
function AssetKpi({ asset }: { asset: AssetId }) {
  const { stats, loading } = useLatestPrice(asset);
  const meta = ASSET_META[asset];
  const change = stats?.day?.changePercent ?? 0;
  const up = change >= 0;

  return (
    <div className="group bg-card border border-border rounded-2xl p-5 transition-all duration-200 hover:border-gold-500/30 hover:-translate-y-0.5">
      <div className="flex items-center justify-between mb-3">
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <span>{meta.emoji}</span> {meta.name}
        </p>
        <Activity className={cn('w-4 h-4', meta.accent)} />
      </div>
      {loading && !stats ? (
        <div className="skeleton h-7 w-28 rounded" />
      ) : (
        <p className="text-2xl font-bold text-foreground tabular-nums">
          ${formatPrice(stats?.current ?? 0, meta.decimals)}
          <span className="text-sm font-medium text-muted-foreground ml-1">/{meta.unit}</span>
        </p>
      )}
      <p
        className={cn(
          'mt-1 text-xs font-medium tabular-nums',
          up ? 'text-emerald-500' : 'text-red-500',
        )}
      >
        {formatPercent(change)} <span className="text-muted-foreground">today</span>
      </p>
    </div>
  );
}

/** Gold-silver ratio KPI. */
function RatioKpi() {
  const { ratio } = useGoldSilverRatio();
  return (
    <div className="group bg-card border border-border rounded-2xl p-5 transition-all duration-200 hover:border-gold-500/30 hover:-translate-y-0.5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Gold / Silver
        </p>
        <Scale className="w-4 h-4 text-gold-400" />
      </div>
      {ratio ? (
        <p className="text-2xl font-bold text-foreground tabular-nums">
          {ratio.ratio.toFixed(1)}
        </p>
      ) : (
        <div className="skeleton h-7 w-16 rounded" />
      )}
      <p className="mt-1 text-xs text-muted-foreground">oz silver per oz gold</p>
    </div>
  );
}

/** Telegram bot health KPI. */
function TelegramKpi() {
  const [status, setStatus] = useState<TelegramStatus | null>(null);

  useEffect(() => {
    telegramApi
      .getStatus()
      .then((res: any) => setStatus(res.data))
      .catch(() => setStatus(null));
  }, []);

  const active = status?.isEnabled;

  return (
    <div className="group bg-card border border-border rounded-2xl p-5 transition-all duration-200 hover:border-gold-500/30 hover:-translate-y-0.5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Telegram Bot
        </p>
        <Bot className="w-4 h-4 text-blue-400" />
      </div>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'w-2 h-2 rounded-full',
            active ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/40',
          )}
        />
        <p className="text-2xl font-bold text-foreground">{active ? 'Active' : 'Idle'}</p>
      </div>
      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
        <span className="flex items-center gap-1">
          <Send className="w-3 h-3 text-emerald-500" />
          {status?.totalSent?.toLocaleString() ?? '—'}
        </span>
        <span className="flex items-center gap-1">
          <XCircle className="w-3 h-3 text-red-500" />
          {status?.totalFailed?.toLocaleString() ?? '—'}
        </span>
        {status?.lastPublish && (
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {format(new Date(status.lastPublish), 'MMM dd HH:mm')}
          </span>
        )}
      </div>
    </div>
  );
}

/** At-a-glance control-panel overview shown at the top of the admin dashboard. */
export function AdminOverview() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {ASSETS.map((asset) => (
        <AssetKpi key={asset} asset={asset} />
      ))}
      {SHOW_GOLD_SILVER_RATIO && <RatioKpi />}
      <TelegramKpi />
    </div>
  );
}
