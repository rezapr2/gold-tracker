import { ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import { ThrottlerStorageService } from '@nestjs/throttler';
import { RedisService } from './redis.service';

/**
 * Shares the request-rate counters across all backend instances via Redis, so
 * the configured limit is global rather than multiplied by the number of
 * replicas behind the load balancer.
 *
 * If Redis is unavailable it transparently falls back to the framework's
 * in-memory storage — i.e. the previous per-instance behaviour — so the API
 * keeps rate-limiting (and keeps serving) when the cache is down.
 */
export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly fallback = new ThrottlerStorageService();

  constructor(private readonly redis: RedisService) {}

  async increment(key: string, ttl: number): Promise<ThrottlerStorageRecord> {
    const result = await this.redis.throttleIncrement(`throttle:${key}`, ttl);
    if (result) return result;
    return this.fallback.increment(key, ttl);
  }
}
