import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsService } from './analytics.service';
import { PriceStatistics, PriceStatisticsSchema } from './schemas/price-statistics.schema';
import { GoldPrice, GoldPriceSchema } from '../price/schemas/gold-price.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PriceStatistics.name, schema: PriceStatisticsSchema },
      { name: GoldPrice.name, schema: GoldPriceSchema },
    ]),
  ],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
