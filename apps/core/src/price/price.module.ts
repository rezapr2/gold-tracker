import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GoldPriceService } from './gold-price.service';
import { GoldPrice, GoldPriceSchema } from './schemas/gold-price.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: GoldPrice.name, schema: GoldPriceSchema }])],
  providers: [GoldPriceService],
  exports: [GoldPriceService, MongooseModule],
})
export class PriceModule {}
