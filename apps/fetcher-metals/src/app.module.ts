import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule, HeartbeatModule, ServiceName } from '@gold-tracker/shared';
import configuration from './config/configuration';
import { validationSchema, validationOptions } from './config/validation';
import { EventsModule } from './events.module';
import { SettingsModule } from './settings/settings.module';
import { FetchModule } from './fetch/fetch.module';
import { HealthController } from './health.controller';

const pkg = require('../package.json');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env', '.env.local'],
      validationSchema,
      validationOptions,
    }),
    ScheduleModule.forRoot(),
    RedisModule,
    EventsModule,
    HeartbeatModule.forRoot({ service: ServiceName.FetcherMetals, version: pkg.version }),
    SettingsModule,
    FetchModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
