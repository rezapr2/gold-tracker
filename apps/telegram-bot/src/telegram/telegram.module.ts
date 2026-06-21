import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TelegramService } from './telegram.service';
import { ChartImageService } from './chart-image.service';
import { TelegramChannelService } from './telegram-channel.service';
import { TelegramRpcController } from './telegram-rpc.controller';
import { TelegramEventsController } from './telegram-events.controller';
import { PublishLog, PublishLogSchema } from './schemas/publish-log.schema';
import { TelegramChannel, TelegramChannelSchema } from './schemas/telegram-channel.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PublishLog.name, schema: PublishLogSchema },
      { name: TelegramChannel.name, schema: TelegramChannelSchema },
    ]),
  ],
  controllers: [TelegramRpcController, TelegramEventsController],
  providers: [TelegramService, ChartImageService, TelegramChannelService],
  exports: [TelegramService, TelegramChannelService],
})
export class TelegramModule {}
