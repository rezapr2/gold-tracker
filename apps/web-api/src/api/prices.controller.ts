import { Controller, Get, Header, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CoreClient } from '../core/core.client';

const METAL_QUERY = { name: 'metal', required: false } as const;

@ApiTags('prices')
@Controller('prices')
export class PricesController {
  constructor(private readonly core: CoreClient) {}

  @Get('latest')
  @ApiOperation({ summary: 'Get latest price' })
  @ApiQuery(METAL_QUERY)
  async getLatest(@Query('metal') metal?: string) {
    return { success: true, data: await this.core.latest(metal) };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get price statistics summary' })
  @ApiQuery(METAL_QUERY)
  async getStats(@Query('metal') metal?: string) {
    return { success: true, data: await this.core.stats(metal) };
  }

  @Get('history')
  @ApiOperation({ summary: 'Get price history' })
  @ApiQuery({ name: 'hours', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery(METAL_QUERY)
  async getHistory(
    @Query('hours') hours = 24,
    @Query('limit') limit = 500,
    @Query('metal') metal?: string,
  ) {
    return { success: true, data: await this.core.history(+hours, +limit, metal) };
  }

  @Get('ratio')
  @ApiOperation({ summary: 'Get the current gold/silver ratio' })
  async getRatio() {
    return { success: true, data: await this.core.ratio() };
  }

  @Get('records')
  @ApiOperation({ summary: 'Get all-time high/low and distance from each' })
  @ApiQuery(METAL_QUERY)
  async getRecords(@Query('metal') metal?: string) {
    return { success: true, data: await this.core.records(metal) };
  }

  @Get('export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="price-history.csv"')
  @ApiOperation({ summary: 'Export raw price history as CSV' })
  @ApiQuery({ name: 'hours', required: false, type: Number })
  @ApiQuery(METAL_QUERY)
  async export(@Query('hours') hours = 720, @Query('metal') metal?: string) {
    return this.core.exportCsv(+hours, metal);
  }

  @Get('candlestick')
  @ApiOperation({ summary: 'Get candlestick OHLC data' })
  @ApiQuery({ name: 'timeframe', required: false, enum: ['1h', '4h', '1d', '7d', '30d'] })
  @ApiQuery(METAL_QUERY)
  async getCandlestick(@Query('timeframe') timeframe = '1d', @Query('metal') metal?: string) {
    return { success: true, data: await this.core.candles(timeframe, metal) };
  }

  @Get('hourly')
  @ApiOperation({ summary: 'Get hourly aggregated price history' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiQuery(METAL_QUERY)
  async getHourly(@Query('days') days = 7, @Query('metal') metal?: string) {
    return { success: true, data: await this.core.hourly(+days, metal) };
  }

  @Get('daily')
  @ApiOperation({ summary: 'Get daily aggregated price history' })
  @ApiQuery({ name: 'months', required: false, type: Number })
  @ApiQuery(METAL_QUERY)
  async getDaily(@Query('months') months = 1, @Query('metal') metal?: string) {
    return { success: true, data: await this.core.daily(+months, metal) };
  }
}
