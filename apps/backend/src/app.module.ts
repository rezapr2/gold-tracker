import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import configuration from './config/configuration';
import { validationSchema, validationOptions } from './config/validation';
import { RedisModule } from './modules/redis/redis.module';
import { RedisService } from './modules/redis/redis.service';
import { RedisThrottlerStorage } from './modules/redis/redis-throttler.storage';
import { GoldPriceModule } from './modules/gold-price/gold-price.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { AuthModule } from './modules/auth/auth.module';
import { SettingsStoreModule } from './modules/settings/settings-store.module';
import { SettingsModule } from './modules/settings/settings.module';
import { WebsocketModule } from './modules/websocket/websocket.module';
import { HealthModule } from './modules/health/health.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env', '.env.local'],
      // Fail fast on a bad/insecure config (e.g. default secrets in production)
      // rather than booting with silently-wrong values.
      validationSchema,
      validationOptions,
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('mongodb.uri'),
        retryWrites: true,
        w: 'majority',
        // Don't (re)build indexes from the schema on every prod boot — indexes
        // are provisioned by docker/mongo/init.js there. Kept on in dev so local
        // schema changes are reflected without re-seeding the database.
        autoIndex: config.get<string>('nodeEnv') !== 'production',
      }),
    }),
    RedisModule,
    // Redis-backed storage so the rate limit is shared across all instances
    // (falls back to per-instance in-memory storage when Redis is unavailable).
    ThrottlerModule.forRootAsync({
      inject: [RedisService],
      useFactory: (redis: RedisService) => ({
        throttlers: [{ ttl: 60000, limit: 100 }],
        storage: new RedisThrottlerStorage(redis),
      }),
    }),
    // Global: must be registered before modules that resolve runtime config.
    SettingsStoreModule,
    GoldPriceModule,
    AnalyticsModule,
    TelegramModule,
    SchedulerModule,
    AuthModule,
    SettingsModule,
    WebsocketModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    // Enforce the configured rate limit across all routes.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
