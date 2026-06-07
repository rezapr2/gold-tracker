import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { format } from 'date-fns';

export interface ChartPoint {
  /** Unix timestamp in seconds. */
  time: number;
  value: number;
}

export interface ChartOptions {
  title: string;
  changePercent?: number;
}

/**
 * Renders gold-price trend charts to PNG for Telegram. Uses a QuickChart-
 * compatible HTTP endpoint so there are no native (canvas/cairo) build
 * dependencies. The endpoint is configurable via QUICKCHART_URL and can point
 * at a self-hosted QuickChart instance for fully private rendering.
 */
@Injectable()
export class ChartImageService {
  private readonly logger = new Logger(ChartImageService.name);

  constructor(private configService: ConfigService) {}

  /** Pure: builds a Chart.js config for a gold trend line (easily testable). */
  buildPriceChartConfig(points: ChartPoint[], opts: ChartOptions): Record<string, any> {
    const up = (opts.changePercent ?? 0) >= 0;
    const lineColor = up ? '#10b981' : '#ef4444';
    const fillColor = up ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)';
    const axisColor = '#94a3b8';
    const gridColor = 'rgba(148,163,184,0.12)';

    return {
      type: 'line',
      data: {
        labels: points.map((p) => format(new Date(p.time * 1000), 'MMM dd')),
        datasets: [
          {
            label: 'XAU/USD',
            data: points.map((p) => p.value),
            borderColor: lineColor,
            backgroundColor: fillColor,
            fill: true,
            tension: 0.3,
            pointRadius: 0,
            borderWidth: 2,
          },
        ],
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: opts.title,
            color: '#f59e0b',
            font: { size: 20, weight: 'bold' },
          },
          legend: { display: false },
        },
        scales: {
          x: {
            ticks: { color: axisColor, maxTicksLimit: 8 },
            grid: { color: gridColor },
          },
          y: {
            ticks: { color: axisColor },
            grid: { color: gridColor },
          },
        },
      },
    };
  }

  /** Renders a Chart.js config to a PNG buffer, or null on failure. */
  async renderPng(config: Record<string, any>): Promise<Buffer | null> {
    const baseUrl =
      this.configService.get<string>('quickchart.url') || 'https://quickchart.io';

    try {
      const response = await axios.post(
        `${baseUrl}/chart`,
        {
          chart: config,
          format: 'png',
          width: 900,
          height: 450,
          devicePixelRatio: 2,
          backgroundColor: '#0d1117',
        },
        { responseType: 'arraybuffer', timeout: 15000 },
      );
      return Buffer.from(response.data);
    } catch (error) {
      this.logger.error(`Chart render failed: ${error.message}`);
      return null;
    }
  }

  /** Convenience: build + render a gold trend chart. */
  async generateGoldChart(points: ChartPoint[], opts: ChartOptions): Promise<Buffer | null> {
    if (!points.length) return null;
    return this.renderPng(this.buildPriceChartConfig(points, opts));
  }
}
