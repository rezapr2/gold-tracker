import { Module } from '@nestjs/common';
import { PricesController } from './prices.controller';
import { AnalyticsController } from './analytics.controller';
import { SettingsController } from './settings.controller';
import { TelegramController } from './telegram.controller';
import { AssetsController } from './assets.controller';
import { ServicesController } from '../admin/services.controller';
import { CatalogController } from '../admin/catalog.controller';
import { WsEventsController } from '../websocket/ws-events.controller';
import { WebsocketModule } from '../websocket/websocket.module';

/** All HTTP controllers (proxy to core via RPC) plus the price.saved → WS bridge. */
@Module({
  imports: [WebsocketModule],
  controllers: [
    PricesController,
    AnalyticsController,
    SettingsController,
    TelegramController,
    AssetsController,
    ServicesController,
    CatalogController,
    WsEventsController,
  ],
})
export class ApiModule {}
