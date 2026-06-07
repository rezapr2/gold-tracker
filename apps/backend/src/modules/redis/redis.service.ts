import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

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
