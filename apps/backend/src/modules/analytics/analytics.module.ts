import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { PriceStatistics, PriceStatisticsSchema } from './schemas/price-statistics.schema';
import { GoldPrice, GoldPriceSchema } from '../gold-price/schemas/gold-price.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PriceStatistics.name, schema: PriceStatisticsSchema },
      { name: GoldPrice.name, schema: GoldPriceSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
