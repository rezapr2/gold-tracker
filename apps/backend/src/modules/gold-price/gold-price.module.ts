import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GoldPriceController } from './gold-price.controller';
import { GoldPriceService } from './gold-price.service';
import { GoldPrice, GoldPriceSchema } from './schemas/gold-price.schema';
import { GoldApiProvider } from './providers/goldapi.provider';
import { MetalsDevProvider } from './providers/metals-dev.provider';
import { TwelveDataProvider } from './providers/twelve-data.provider';
import { AlphaVantageProvider } from './providers/alpha-vantage.provider';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: GoldPrice.name, schema: GoldPriceSchema }]),
  ],
  controllers: [GoldPriceController],
  providers: [
    GoldPriceService,
    GoldApiProvider,
    MetalsDevProvider,
    TwelveDataProvider,
    AlphaVantageProvider,
  ],
  exports: [GoldPriceService],
})
export class GoldPriceModule {}
