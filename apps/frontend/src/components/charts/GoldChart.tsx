'use client';
import { useEffect, useRef, useState } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  ColorType,
} from 'lightweight-charts';
import { useCandlestickData } from '@/hooks/useGoldPrice';
import { Timeframe } from '@/types';
import { Metal, METAL_META, DEFAULT_METAL } from '@/lib/metals';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';

const TIMEFRAMES: { label: string; value: Timeframe }[] = [
  { label: '1H', value: '1h' },
  { label: '4H', value: '4h' },
  { label: '1D', value: '1d' },
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
];

type ChartType = 'candlestick' | 'area' | 'line';

const CHART_TYPES: { label: string; value: ChartType }[] = [
  { label: 'Candle', value: 'candlestick' },
  { label: 'Area', value: 'area' },
  { label: 'Line', value: 'line' },
];

interface GoldChartProps {
  metal?: Metal;
}

export function GoldChart({ metal = DEFAULT_METAL }: GoldChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<any> | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>('1d');
  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const { data, loading } = useCandlestickData(timeframe, metal);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const meta = METAL_META[metal];

  const getChartColors = () => {
    const lineRgb = metal === 'XAG' ? '148, 163, 184' : '245, 158, 11';
    return {
      background: isDark ? '#0d1117' : '#ffffff',
      text: isDark ? '#94a3b8' : '#64748b',
      grid: isDark ? '#1e2432' : '#f1f5f9',
      border: isDark ? '#1e2432' : '#e2e8f0',
      upColor: '#10b981',
      downColor: '#ef4444',
      wickUp: '#10b981',
      wickDown: '#ef4444',
      areaTop: `rgba(${lineRgb}, 0.3)`,
      areaBottom: `rgba(${lineRgb}, 0)`,
      line: meta.chartColor,
    };
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const colors = getChartColors();

    chartRef.current = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 380,
      layout: {
        background: { type: ColorType.Solid, color: colors.background },
        textColor: colors.text,
      },
      grid: {
        vertLines: { color: colors.grid },
        horzLines: { color: colors.grid },
      },
      crosshair: { mode: 1 },
      rightPriceScale: {
        borderColor: colors.border,
        textColor: colors.text,
      },
      timeScale: {
        borderColor: colors.border,
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chartRef.current?.applyOptions({ width: entry.contentRect.width });
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chartRef.current?.remove();
      chartRef.current = null;
    };
  }, [isDark]);

  useEffect(() => {
    if (!chartRef.current || loading || !data.length) return;

    if (seriesRef.current) {
      chartRef.current.removeSeries(seriesRef.current);
    }

    const colors = getChartColors();

    if (chartType === 'candlestick') {
      const series = chartRef.current.addCandlestickSeries({
        upColor: colors.upColor,
        downColor: colors.downColor,
        borderUpColor: colors.upColor,
        borderDownColor: colors.downColor,
        wickUpColor: colors.wickUp,
        wickDownColor: colors.wickDown,
      });
      series.setData(data);
      seriesRef.current = series;
    } else if (chartType === 'area') {
      const series = chartRef.current.addAreaSeries({
        topColor: colors.areaTop,
        bottomColor: colors.areaBottom,
        lineColor: colors.line,
        lineWidth: 2,
      });
      series.setData(data.map((d: any) => ({ time: d.time, value: d.close })));
      seriesRef.current = series;
    } else {
      const series = chartRef.current.addLineSeries({
        color: colors.line,
        lineWidth: 2,
      });
      series.setData(data.map((d: any) => ({ time: d.time, value: d.close })));
      seriesRef.current = series;
    }

    chartRef.current.timeScale().fitContent();
  }, [data, chartType, loading]);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-3.5 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">{meta.emoji} {meta.symbol} Chart</h3>

        {/* On phones the two toggle groups scroll horizontally instead of
            overflowing the card. */}
        <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex shrink-0 gap-0.5 p-0.5 bg-secondary rounded-lg">
            {CHART_TYPES.map((ct) => (
              <button
                key={ct.value}
                onClick={() => setChartType(ct.value)}
                className={cn(
                  'px-2.5 py-1.5 sm:py-1 rounded-md text-xs font-medium transition-all',
                  chartType === ct.value
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {ct.label}
              </button>
            ))}
          </div>

          <div className="flex shrink-0 gap-0.5 p-0.5 bg-secondary rounded-lg">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.value}
                onClick={() => setTimeframe(tf.value)}
                className={cn(
                  'px-2.5 py-1.5 sm:py-1 rounded-md text-xs font-medium transition-all',
                  timeframe === tf.value
                    ? 'bg-gold-500/20 text-gold-400'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative min-h-[380px]">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card/80 backdrop-blur-sm z-10">
            <div className="w-6 h-6 rounded-full border-2 border-gold-500 border-t-transparent animate-spin" />
            <p className="text-xs text-muted-foreground">Loading {meta.symbol} chart…</p>
          </div>
        )}
        {!loading && data.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 z-10">
            <p className="text-sm font-medium text-foreground">No chart data yet</p>
            <p className="text-xs text-muted-foreground">
              Try a different timeframe — data appears as prices are collected.
            </p>
          </div>
        )}
        <div ref={containerRef} className="w-full" />
      </div>
    </div>
  );
}
