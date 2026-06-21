import { Module } from '@nestjs/common';
import { IngestController } from './ingest.controller';
import { PriceModule } from '../price/price.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [PriceModule, SettingsModule],
  controllers: [IngestController],
})
export class IngestModule {}
