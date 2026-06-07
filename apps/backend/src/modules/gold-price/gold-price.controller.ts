import { Controller, Get, Header, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { GoldPriceService } from './gold-price.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { toMetal } from './metal.types';

const METAL_QUERY = { name: 'metal', required: false, enum: ['XAU', 'XAG'] } as const;

@ApiTags('prices')
@Controller('prices')
export class GoldPriceController {
  constructor(private readonly goldPriceService: GoldPriceService) {}

  @Get('latest')
  @ApiOperation({ summary: 'Get latest price' })
  @ApiQuery(METAL_QUERY)
  async getLatest(@Query('metal') metal?: string) {
    const price = await this.goldPriceService.getLatestPrice(toMetal(metal));
    return { success: true, data: price };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get price statistics summary' })
  @ApiQuery(METAL_QUERY)
  async getStats(@Query('metal') metal?: string) {
    const stats = await this.goldPriceService.getPriceStats(toMetal(metal));
    return { success: true, data: stats };
  }

  @Get('history')
  @ApiOperation({ summary: 'Get price history' })
  @ApiQuery({ name: 'hours', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery(METAL_QUERY)
  async getHistory(
    @Query('hours') hours: number = 24,
    @Query('limit') limit: number = 500,
    @Query('metal') metal?: string,
  ) {
    const history = await this.goldPriceService.getPriceHistory(+hours, +limit, toMetal(metal));
    return { success: true, data: history };
  }

  @Get('ratio')
  @ApiOperation({ summary: 'Get the current gold/silver ratio' })
  async getRatio() {
    const data = await this.goldPriceService.getGoldSilverRatio();
    return { success: true, data };
  }

  @Get('records')
  @ApiOperation({ summary: 'Get all-time high/low and distance from each' })
  @ApiQuery(METAL_QUERY)
  async getRecords(@Query('metal') metal?: string) {
    const data = await this.goldPriceService.getRecords(toMetal(metal));
    return { success: true, data };
  }

  @Get('export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="price-history.csv"')
  @ApiOperation({ summary: 'Export raw price history as CSV' })
  @ApiQuery({ name: 'hours', required: false, type: Number })
  @ApiQuery(METAL_QUERY)
  async export(@Query('hours') hours: number = 720, @Query('metal') metal?: string) {
    return this.goldPriceService.exportHistoryCsv(+hours, toMetal(metal));
  }

  @Get('candlestick')
  @ApiOperation({ summary: 'Get candlestick OHLC data' })
  @ApiQuery({ name: 'timeframe', required: false, enum: ['1h', '4h', '1d', '7d', '30d'] })
  @ApiQuery(METAL_QUERY)
  async getCandlestick(
    @Query('timeframe') timeframe: '1h' | '4h' | '1d' | '7d' | '30d' = '1d',
    @Query('metal') metal?: string,
  ) {
    const data = await this.goldPriceService.getCandlestickData(timeframe, toMetal(metal));
    return { success: true, data };
  }

  @Get('hourly')
  @ApiOperation({ summary: 'Get hourly aggregated price history' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiQuery(METAL_QUERY)
  async getHourly(@Query('days') days: number = 7, @Query('metal') metal?: string) {
    const history = await this.goldPriceService.getHourlyHistory(+days, toMetal(metal));
    return { success: true, data: history };
  }

  @Get('daily')
  @ApiOperation({ summary: 'Get daily aggregated price history' })
  @ApiQuery({ name: 'months', required: false, type: Number })
  @ApiQuery(METAL_QUERY)
  async getDaily(@Query('months') months: number = 1, @Query('metal') metal?: string) {
    const history = await this.goldPriceService.getDailyHistory(+months, toMetal(metal));
    return { success: true, data: history };
  }

  @Post('backfill')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'One-time import of historical daily prices (idempotent)' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiQuery(METAL_QUERY)
  async backfill(@Query('days') days: number = 5000, @Query('metal') metal?: string) {
    const result = await this.goldPriceService.backfillDailyHistory(+days, toMetal(metal));
    return { success: true, data: result };
  }
}
