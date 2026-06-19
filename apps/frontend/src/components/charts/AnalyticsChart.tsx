'use client';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { format } from 'date-fns';
import { GoldPrice } from '@/types';
import { Metal, METAL_META, DEFAULT_METAL } from '@/lib/metals';
import { useTheme } from 'next-themes';

interface AnalyticsChartProps {
  data: GoldPrice[];
  loading?: boolean;
  metal?: Metal;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-xl text-xs">
      <p className="text-muted-foreground mb-1">{label}</p>
      <p className="font-semibold text-foreground">
        ${payload[0]?.value?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </p>
    </div>
  );
};

export function AnalyticsChart({ data, loading, metal = DEFAULT_METAL }: AnalyticsChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { chartColor, gradientId } = METAL_META[metal];

  if (loading) {
    return <div className="skeleton h-48 rounded-2xl border border-border" />;
  }

  if (!data.length) {
    return (
      <div className="h-48 flex items-center justify-center rounded-2xl border border-dashed border-border">
        <p className="text-xs text-muted-foreground">No recent data to plot</p>
      </div>
    );
  }

  const chartData = data.map((p) => ({
    time: format(new Date(p.timestamp), 'HH:mm'),
    price: p.price,
  }));

  const prices = data.map((p) => p.price);
  const minPrice = Math.min(...prices) * 0.9995;
  const maxPrice = Math.max(...prices) * 1.0005;
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chartColor} stopOpacity={0.3} />
            <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={isDark ? '#1e2432' : '#f1f5f9'}
          vertical={false}
        />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 10, fill: isDark ? '#64748b' : '#94a3b8' }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[minPrice, maxPrice]}
          tick={{ fontSize: 10, fill: isDark ? '#64748b' : '#94a3b8' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `$${v.toFixed(0)}`}
          width={65}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine
          y={avgPrice}
          stroke={isDark ? '#334155' : '#cbd5e1'}
          strokeDasharray="3 3"
        />
        <Area
          type="monotone"
          dataKey="price"
          stroke={chartColor}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 4, fill: chartColor, stroke: 'transparent' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
