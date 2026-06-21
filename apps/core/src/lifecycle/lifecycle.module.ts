import { Module } from '@nestjs/common';
import { LifecycleService } from './lifecycle.service';
import { PriceModule } from '../price/price.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [PriceModule, AnalyticsModule, SettingsModule],
  providers: [LifecycleService],
})
export class LifecycleModule {}
