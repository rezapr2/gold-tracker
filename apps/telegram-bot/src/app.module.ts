import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule, HeartbeatModule, ServiceName, RmqAckInterceptor } from '@gold-tracker/shared';
import configuration from './config/configuration';
import { validationSchema, validationOptions } from './config/validation';
import { CoreModule } from './core/core.module';
import { SettingsModule } from './settings/settings.module';
import { TelegramModule } from './telegram/telegram.module';
import { SchedulerModule } from './scheduler/scheduler.module';
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
    CoreModule,
    HeartbeatModule.forRoot({ service: ServiceName.TelegramBot, version: pkg.version }),
    SettingsModule,
    TelegramModule,
    SchedulerModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_INTERCEPTOR, useClass: RmqAckInterceptor }],
})
export class AppModule {}
