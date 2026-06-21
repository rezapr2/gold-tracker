import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CoreClient } from '../core/core.client';

const METAL_QUERY = { name: 'metal', required: false } as const;

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly core: CoreClient) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get analytics summary (daily/weekly/monthly)' })
  @ApiQuery(METAL_QUERY)
  async getSummary(@Query('metal') metal?: string) {
    return { success: true, data: await this.core.analyticsSummary(metal) };
  }

  @Get('daily')
  @ApiOperation({ summary: 'Get daily analytics' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiQuery(METAL_QUERY)
  async getDaily(@Query('days') days = 30, @Query('metal') metal?: string) {
    return { success: true, data: await this.core.analyticsSeries('daily', +days, metal) };
  }

  @Get('weekly')
  @ApiOperation({ summary: 'Get weekly analytics' })
  @ApiQuery({ name: 'weeks', required: false, type: Number })
  @ApiQuery(METAL_QUERY)
  async getWeekly(@Query('weeks') weeks = 12, @Query('metal') metal?: string) {
    return { success: true, data: await this.core.analyticsSeries('weekly', +weeks, metal) };
  }

  @Get('monthly')
  @ApiOperation({ summary: 'Get monthly analytics' })
  @ApiQuery({ name: 'months', required: false, type: Number })
  @ApiQuery(METAL_QUERY)
  async getMonthly(@Query('months') months = 12, @Query('metal') metal?: string) {
    return { success: true, data: await this.core.analyticsSeries('monthly', +months, metal) };
  }

  @Get('moving-average')
  @ApiOperation({ summary: 'Get moving average data' })
  @ApiQuery({ name: 'period', required: false, type: Number })
  @ApiQuery(METAL_QUERY)
  async getMovingAverage(@Query('period') period = 7, @Query('metal') metal?: string) {
    return { success: true, data: await this.core.analyticsSeries('moving-average', +period, metal) };
  }
}
