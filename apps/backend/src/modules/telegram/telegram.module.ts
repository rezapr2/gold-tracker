import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TelegramController } from './telegram.controller';
import { TelegramService } from './telegram.service';
import { ChartImageService } from './chart-image.service';
import { TelegramChannelService } from './telegram-channel.service';
import { PublishLog, PublishLogSchema } from './schemas/publish-log.schema';
import { TelegramChannel, TelegramChannelSchema } from './schemas/telegram-channel.schema';
import { GoldPriceModule } from '../gold-price/gold-price.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PublishLog.name, schema: PublishLogSchema },
      { name: TelegramChannel.name, schema: TelegramChannelSchema },
    ]),
    GoldPriceModule,
  ],
  controllers: [TelegramController],
  providers: [TelegramService, ChartImageService, TelegramChannelService],
  exports: [TelegramService],
})
export class TelegramModule {}
