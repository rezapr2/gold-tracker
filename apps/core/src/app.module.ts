import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule, HeartbeatModule, ServiceName, RmqAckInterceptor } from '@gold-tracker/shared';
import configuration from './config/configuration';
import { validationSchema, validationOptions } from './config/validation';
import { EventsModule } from './events.module';
import { PriceModule } from './price/price.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SettingsModule } from './settings/settings.module';
import { IngestModule } from './ingest/ingest.module';
import { RpcModule } from './rpc/rpc.module';
import { LifecycleModule } from './lifecycle/lifecycle.module';
import { RegistryModule } from './registry/registry.module';
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
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('mongodb.uri'),
        retryWrites: true,
        w: 'majority',
        autoIndex: config.get<string>('nodeEnv') !== 'production',
      }),
    }),
    ScheduleModule.forRoot(),
    RedisModule,
    EventsModule,
    HeartbeatModule.forRoot({ service: ServiceName.Core, version: pkg.version }),
    PriceModule,
    AnalyticsModule,
    SettingsModule,
    IngestModule,
    RpcModule,
    LifecycleModule,
    RegistryModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_INTERCEPTOR, useClass: RmqAckInterceptor }],
})
export class AppModule {}
