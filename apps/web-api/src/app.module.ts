import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { RedisModule, RedisService, HeartbeatModule, ServiceName } from '@gold-tracker/shared';
import configuration from './config/configuration';
import { validationSchema, validationOptions } from './config/validation';
import { RedisThrottlerStorage } from './throttler/redis-throttler.storage';
import { HttpThrottlerGuard } from './throttler/http-throttler.guard';
import { CoreModule } from './core/core.module';
import { AuthModule } from './auth/auth.module';
import { ApiModule } from './api/api.module';
import { HealthModule } from './health/health.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

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
    RedisModule,
    ThrottlerModule.forRootAsync({
      inject: [RedisService],
      useFactory: (redis: RedisService) => ({
        throttlers: [{ ttl: 60000, limit: 100 }],
        storage: new RedisThrottlerStorage(redis),
      }),
    }),
    CoreModule,
    HeartbeatModule.forRoot({ service: ServiceName.WebApi, version: pkg.version }),
    AuthModule,
    ApiModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_GUARD, useClass: HttpThrottlerGuard },
  ],
})
export class AppModule {}
