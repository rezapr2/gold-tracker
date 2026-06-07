import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { toMetal } from '../gold-price/metal.types';

const METAL_QUERY = { name: 'metal', required: false, enum: ['XAU', 'XAG'] } as const;

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get analytics summary (daily/weekly/monthly)' })
  @ApiQuery(METAL_QUERY)
  async getSummary(@Query('metal') metal?: string) {
    const data = await this.analyticsService.getSummary(toMetal(metal));
    return { success: true, data };
  }

  @Get('daily')
  @ApiOperation({ summary: 'Get daily analytics' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiQuery(METAL_QUERY)
  async getDaily(@Query('days') days: number = 30, @Query('metal') metal?: string) {
    const data = await this.analyticsService.getDailyAnalytics(+days, toMetal(metal));
    return { success: true, data };
  }

  @Get('weekly')
  @ApiOperation({ summary: 'Get weekly analytics' })
  @ApiQuery({ name: 'weeks', required: false, type: Number })
  @ApiQuery(METAL_QUERY)
  async getWeekly(@Query('weeks') weeks: number = 12, @Query('metal') metal?: string) {
    const data = await this.analyticsService.getWeeklyAnalytics(+weeks, toMetal(metal));
    return { success: true, data };
  }

  @Get('monthly')
  @ApiOperation({ summary: 'Get monthly analytics' })
  @ApiQuery({ name: 'months', required: false, type: Number })
  @ApiQuery(METAL_QUERY)
  async getMonthly(@Query('months') months: number = 12, @Query('metal') metal?: string) {
    const data = await this.analyticsService.getMonthlyAnalytics(+months, toMetal(metal));
    return { success: true, data };
  }

  @Get('moving-average')
  @ApiOperation({ summary: 'Get moving average data' })
  @ApiQuery({ name: 'period', required: false, type: Number })
  @ApiQuery(METAL_QUERY)
  async getMovingAverage(@Query('period') period: number = 7, @Query('metal') metal?: string) {
    const data = await this.analyticsService.calculateMovingAverages(+period, toMetal(metal));
    return { success: true, data };
  }
}
