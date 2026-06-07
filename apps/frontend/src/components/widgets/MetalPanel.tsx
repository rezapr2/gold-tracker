'use client';
import { PriceCard } from '@/components/widgets/PriceCard';
import { StatsWidget } from '@/components/widgets/StatsWidget';
import { GoldChart } from '@/components/charts/GoldChart';
import { AnalyticsChart } from '@/components/charts/AnalyticsChart';
import { useLatestPrice, usePriceHistory, useRecords } from '@/hooks/useGoldPrice';
import { exportHistoryUrl } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { Metal, METAL_META } from '@/lib/metals';
import { TrendingUp, TrendingDown, Activity, Calendar, Download, Award, Anchor } from 'lucide-react';

interface MetalPanelProps {
  metal: Metal;
}

/** Full single-metal view: price card, 24h movement, stats and interactive chart. */
export function MetalPanel({ metal }: MetalPanelProps) {
  const { price, stats, loading, refetch } = useLatestPrice(metal);
  const { history, loading: historyLoading } = usePriceHistory(24, 200, metal);
  const { records, loading: recordsLoading } = useRecords(metal);
  const meta = METAL_META[metal];

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <span>{meta.emoji}</span>
          <span>{meta.name}</span>
          <span className="text-xs font-normal text-muted-foreground">{meta.symbol}</span>
        </h2>
        <a
          href={exportHistoryUrl(metal, 720)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          title="Download 30 days of price history as CSV"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </a>
      </div>

      <PriceCard stats={stats} loading={loading} onRefresh={refetch} metal={metal} />

      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-foreground">24H Price Movement</p>
          <span className="text-xs text-muted-foreground">{history.length} data points</span>
        </div>
        <AnalyticsChart data={history} loading={historyLoading} metal={metal} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatsWidget
          title="Current Price"
          value={`$${formatPrice(stats?.current ?? 0)}`}
          change={stats?.day?.changePercent}
          subtitle="vs yesterday open"
          icon={Activity}
          loading={loading}
        />
        <StatsWidget
          title="7D Change"
          value={`${(stats?.week?.changePercent ?? 0) >= 0 ? '+' : ''}${(stats?.week?.changePercent ?? 0).toFixed(2)}%`}
          change={stats?.week?.changePercent}
          subtitle="last 7 days"
          icon={Calendar}
          loading={loading}
        />
        <StatsWidget
          title="24H High"
          value={`$${formatPrice(stats?.day?.high ?? 0)}`}
          icon={TrendingUp}
          iconColor="text-emerald-500"
          loading={loading}
        />
        <StatsWidget
          title="24H Low"
          value={`$${formatPrice(stats?.day?.low ?? 0)}`}
          icon={TrendingDown}
          iconColor="text-red-500"
          loading={loading}
        />
        <StatsWidget
          title="All-Time High"
          value={`$${formatPrice(records?.high ?? 0)}`}
          change={records?.fromHighPercent}
          subtitle="from high"
          icon={Award}
          iconColor="text-gold-400"
          loading={recordsLoading}
        />
        <StatsWidget
          title="All-Time Low"
          value={`$${formatPrice(records?.low ?? 0)}`}
          change={records?.fromLowPercent}
          subtitle="from low"
          icon={Anchor}
          iconColor="text-sky-500"
          loading={recordsLoading}
        />
      </div>

      <GoldChart metal={metal} />
    </section>
  );
}
