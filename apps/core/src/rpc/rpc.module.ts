import { Module } from '@nestjs/common';
import { PriceRpcController } from './price-rpc.controller';
import { AnalyticsRpcController } from './analytics-rpc.controller';
import { SettingsRpcController } from './settings-rpc.controller';
import { PriceModule } from '../price/price.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [PriceModule, AnalyticsModule, SettingsModule],
  controllers: [PriceRpcController, AnalyticsRpcController, SettingsRpcController],
})
export class RpcModule {}
