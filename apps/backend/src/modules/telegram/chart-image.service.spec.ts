import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ChartImageService, ChartPoint } from './chart-image.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ChartImageService', () => {
  const config: Record<string, any> = { 'quickchart.url': 'https://quickchart.test' };
  const service = new ChartImageService({ get: (k: string) => config[k] } as ConfigService);

  const points: ChartPoint[] = [
    { time: 1_700_000_000, value: 2400 },
    { time: 1_700_086_400, value: 2425 },
    { time: 1_700_172_800, value: 2450 },
  ];

  afterEach(() => jest.clearAllMocks());

  describe('buildPriceChartConfig', () => {
    it('uses a green line for a positive change', () => {
      const cfg = service.buildPriceChartConfig(points, { title: 'T', changePercent: 1.2 });
      expect(cfg.type).toBe('line');
      expect(cfg.data.datasets[0].borderColor).toBe('#10b981');
      expect(cfg.data.datasets[0].data).toEqual([2400, 2425, 2450]);
      expect(cfg.data.labels).toHaveLength(3);
    });

    it('uses a red line for a negative change', () => {
      const cfg = service.buildPriceChartConfig(points, { title: 'T', changePercent: -2 });
      expect(cfg.data.datasets[0].borderColor).toBe('#ef4444');
    });
  });

  describe('generateGoldChart', () => {
    it('returns null for empty data without calling the renderer', async () => {
      const result = await service.generateGoldChart([], { title: 'T' });
      expect(result).toBeNull();
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('returns a PNG buffer from the render endpoint', async () => {
      const png = Buffer.from('fake-png-bytes');
      mockedAxios.post.mockResolvedValue({ data: png });

      const result = await service.generateGoldChart(points, { title: 'T', changePercent: 1 });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://quickchart.test/chart',
        expect.objectContaining({ format: 'png' }),
        expect.objectContaining({ responseType: 'arraybuffer' }),
      );
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('returns null when the render endpoint fails', async () => {
      mockedAxios.post.mockRejectedValue(new Error('boom'));
      const result = await service.generateGoldChart(points, { title: 'T' });
      expect(result).toBeNull();
    });
  });
});
