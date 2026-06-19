'use client';
import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { analyticsApi } from '@/lib/api';
import { PriceStatistics } from '@/types';
import { format } from 'date-fns';
import { formatPrice, formatPercent, cn } from '@/lib/utils';
import { useTheme } from 'next-themes';

export default function AnalyticsPage() {
  const [daily, setDaily] = useState<PriceStatistics[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    Promise.all([
      analyticsApi.getDaily(30),
      analyticsApi.getSummary(),
    ])
      .then(([dailyRes, summaryRes]: any[]) => {
        setDaily((dailyRes.data || []).reverse());
        setSummary(summaryRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const chartColors = {
    grid: isDark ? '#1e2432' : '#f1f5f9',
    text: isDark ? '#64748b' : '#94a3b8',
  };

  const dailyChartData = daily.map((d) => ({
    date: format(new Date(d.periodStart), 'MMM dd'),
    open: d.openPrice,
    close: d.closePrice,
    high: d.highPrice,
    low: d.lowPrice,
    avg: d.averagePrice,
    change: d.changePercent,
  }));

  if (loading) {
    return (
      <div className="flex flex-col flex-1">
        <Header title="Analytics" />
        <div className="p-4 sm:p-6 grid grid-cols-1 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-64 rounded-2xl border border-border" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="Analytics" />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Daily Summary', data: summary.daily, period: 'Today' },
              { label: 'Weekly Summary', data: summary.weekly, period: 'This Week' },
              { label: 'Monthly Summary', data: summary.monthly, period: 'This Month' },
            ].map(({ label, data, period }) => (
              <div key={label} className="bg-card border border-border rounded-2xl p-5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  {label}
                </p>
                {data ? (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Avg Price</span>
                      <span className="text-xs font-semibold text-foreground">
                        ${formatPrice(data.averagePrice)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Change</span>
                      <span
                        className={cn(
                          'text-xs font-semibold',
                          data.changePercent >= 0 ? 'text-emerald-500' : 'text-red-500',
                        )}
                      >
                        {formatPercent(data.changePercent)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Volatility</span>
                      <span className="text-xs font-semibold text-foreground">
                        ${formatPrice(data.volatility)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Data Points</span>
                      <span className="text-xs font-semibold text-foreground">
                        {data.dataPoints?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No data available</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Daily price chart */}
        {dailyChartData.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-5">
            <p className="text-sm font-semibold text-foreground mb-4">30-Day Price History</p>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={dailyChartData}>
                <defs>
                  <linearGradient id="avgGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: chartColors.text }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: chartColors.text }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toFixed(0)}`} width={65} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#0f1623' : '#fff',
                    border: `1px solid ${isDark ? '#1e2432' : '#e2e8f0'}`,
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                  formatter={(v: any) => [`$${formatPrice(v)}`, '']}
                />
                <Area type="monotone" dataKey="avg" stroke="#f59e0b" fill="url(#avgGradient)" strokeWidth={2} dot={false} name="Avg Price" />
                <Area type="monotone" dataKey="high" stroke="#10b981" fill="none" strokeWidth={1} strokeDasharray="3 3" dot={false} name="High" />
                <Area type="monotone" dataKey="low" stroke="#ef4444" fill="none" strokeWidth={1} strokeDasharray="3 3" dot={false} name="Low" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Daily change bar chart */}
        {dailyChartData.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-5">
            <p className="text-sm font-semibold text-foreground mb-4">Daily % Change</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: chartColors.text }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: chartColors.text }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v.toFixed(1)}%`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#0f1623' : '#fff',
                    border: `1px solid ${isDark ? '#1e2432' : '#e2e8f0'}`,
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                  formatter={(v: any) => [`${v.toFixed(2)}%`, 'Change']}
                />
                <Bar
                  dataKey="change"
                  name="% Change"
                  radius={[3, 3, 0, 0]}
                  fill="#f59e0b"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
