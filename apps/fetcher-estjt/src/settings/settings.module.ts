import { Global, Module } from '@nestjs/common';
import { SettingsStoreService } from './settings-store.service';

@Global()
@Module({
  providers: [SettingsStoreService],
  exports: [SettingsStoreService],
})
export class SettingsModule {}
