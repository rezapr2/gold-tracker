import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { Rpc, toAsset } from '@gold-tracker/shared';
import { AnalyticsService } from '../analytics/analytics.service';

/** Answers the `analytics.*` read RPCs. */
@Controller()
export class AnalyticsRpcController {
  constructor(private readonly analytics: AnalyticsService) {}

  @MessagePattern(Rpc.AnalyticsSummary)
  summary(@Payload() p: { metal?: string }) {
    return this.analytics.getSummary(toAsset(p?.metal));
  }

  @MessagePattern(Rpc.AnalyticsSeries)
  series(@Payload() p: { metal?: string; period?: 'daily' | 'weekly' | 'monthly' | 'moving-average'; n?: number }) {
    const metal = toAsset(p?.metal);
    switch (p?.period) {
      case 'weekly': return this.analytics.getWeeklyAnalytics(+(p?.n ?? 12), metal);
      case 'monthly': return this.analytics.getMonthlyAnalytics(+(p?.n ?? 12), metal);
      case 'moving-average': return this.analytics.calculateMovingAverages(+(p?.n ?? 7), metal);
      case 'daily':
      default: return this.analytics.getDailyAnalytics(+(p?.n ?? 30), metal);
    }
  }
}
