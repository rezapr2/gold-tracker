import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import Redis from 'ioredis';

// Compare-and-delete: only release a lock we still own, so a lock that already
// expired and was re-acquired by another instance is never deleted by us.
const RELEASE_LOCK = `
if redis.call('get', KEYS[1]) == ARGV[1] then
  return redis.call('del', KEYS[1])
else
  return 0
end`;

// Atomic rate-limit step: increment the counter and (re)apply the window TTL on
// the first hit or if the key somehow lost its expiry. Returns [hits, pttlMs].
const THROTTLE_INCR = `
local hits = redis.call('INCR', KEYS[1])
local pttl = redis.call('PTTL', KEYS[1])
if hits == 1 or pttl < 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
  pttl = tonumber(ARGV[1])
end
return {hits, pttl}`;

/**
 * Thin Redis wrapper that degrades gracefully: if Redis is not configured or
 * unreachable, every operation becomes a no-op (reads return null) so the app
 * keeps working without a cache. Used for hot-path caching and shared state.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private available = false;

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('redis.host');
    if (!host) {
      this.logger.warn('Redis host not configured; caching/shared-state disabled');
      return;
    }

    try {
      this.client = new Redis({
        host,
        port: this.configService.get<number>('redis.port'),
        password: this.configService.get<string>('redis.password') || undefined,
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000)),
      });

      this.client.on('ready', () => {
        this.available = true;
        this.logger.log('Redis connected');
      });
      this.client.on('end', () => (this.available = false));
      this.client.on('error', (err) => {
        if (this.available) this.logger.warn(`Redis error: ${err.message}`);
        this.available = false;
      });

      this.client.connect().catch((err) => this.logger.warn(`Redis unavailable: ${err.message}`));
    } catch (err: any) {
      this.logger.warn(`Redis init failed: ${err.message}`);
    }
  }

  isAvailable(): boolean {
    return this.available;
  }

  async get(key: string): Promise<string | null> {
    if (!this.available || !this.client) return null;
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.available || !this.client) return;
    try {
      if (ttlSeconds) await this.client.set(key, value, 'EX', ttlSeconds);
      else await this.client.set(key, value);
    } catch {
      /* ignore cache write failures */
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (!this.available || !this.client || !keys.length) return;
    try {
      await this.client.del(...keys);
    } catch {
      /* ignore */
    }
  }

  /**
   * Runs `fn` only if this instance wins a short-lived Redis lock for `key`, so
   * a scheduled job executes once across all backend instances instead of once
   * per instance. Returns true if the work ran here, false if another instance
   * already holds the lock (caller can skip quietly).
   *
   * Degradation: without Redis (single-instance / dev) there is nothing to
   * coordinate, so it always runs. If Redis is configured but errors mid-acquire
   * it skips — for jobs with external side effects (Telegram, alerts, provider
   * quota) a missed tick is safer than a duplicate one.
   *
   * `ttlMs` is only a crash safety net: the lock is released as soon as `fn`
   * finishes, so set it comfortably above the job's worst-case runtime.
   */
  async runExclusive(key: string, ttlMs: number, fn: () => Promise<void>): Promise<boolean> {
    if (!this.available || !this.client) {
      await fn();
      return true;
    }

    const token = randomUUID();
    try {
      const acquired = (await this.client.set(key, token, 'PX', ttlMs, 'NX')) === 'OK';
      if (!acquired) return false;
    } catch {
      return false;
    }

    try {
      await fn();
    } finally {
      try {
        await this.client.eval(RELEASE_LOCK, 1, key, token);
      } catch {
        /* lock will auto-expire via its TTL */
      }
    }
    return true;
  }

  /**
   * Atomic increment of a rate-limit counter shared across instances, mirroring
   * the units of @nestjs/throttler's storage contract: `ttlMs` in milliseconds,
   * `timeToExpire` returned in seconds. Returns null when Redis is unavailable
   * so callers can fall back to per-instance limiting.
   */
  async throttleIncrement(
    key: string,
    ttlMs: number,
  ): Promise<{ totalHits: number; timeToExpire: number } | null> {
    if (!this.available || !this.client) return null;
    try {
      const [hits, pttl] = (await this.client.eval(
        THROTTLE_INCR,
        1,
        key,
        String(ttlMs),
      )) as [number, number];
      return { totalHits: hits, timeToExpire: Math.ceil(pttl / 1000) };
    } catch {
      return null;
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  onModuleDestroy() {
    this.client?.disconnect();
  }
}
