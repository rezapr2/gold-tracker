import { INestApplicationContext, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';

/**
 * Socket.IO adapter backed by Redis pub/sub. With the default in-memory adapter
 * `server.emit()` only reaches clients connected to the local instance; behind a
 * load balancer that means a price update fetched by one replica reaches roughly
 * 1/N of all clients. This adapter broadcasts events through Redis so every
 * replica delivers them to its own clients.
 *
 * Degrades gracefully: if Redis is not configured or unreachable, {@link connect}
 * returns false and the server keeps the default single-instance adapter.
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor?: ReturnType<typeof createAdapter>;
  private pubClient?: Redis;
  private subClient?: Redis;

  constructor(private readonly app: INestApplicationContext) {
    super(app);
  }

  async connect(): Promise<boolean> {
    const config = this.app.get(ConfigService);
    const host = config.get<string>('redis.host');
    if (!host) {
      this.logger.warn('Redis not configured; WebSocket fan-out limited to this instance');
      return false;
    }

    try {
      this.pubClient = new Redis({
        host,
        port: config.get<number>('redis.port'),
        password: config.get<string>('redis.password') || undefined,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
      });
      this.subClient = this.pubClient.duplicate();
      await Promise.all([this.pubClient.connect(), this.subClient.connect()]);
      this.adapterConstructor = createAdapter(this.pubClient, this.subClient);
      this.logger.log('WebSocket Redis adapter connected — cross-instance fan-out enabled');
      return true;
    } catch (err: any) {
      this.logger.warn(`WebSocket Redis adapter unavailable: ${err.message}`);
      this.pubClient?.disconnect();
      this.subClient?.disconnect();
      this.adapterConstructor = undefined;
      return false;
    }
  }

  createIOServer(port: number, options?: ServerOptions): any {
    // CORS and other gateway options are forwarded by Nest in `options`.
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) server.adapter(this.adapterConstructor);
    return server;
  }
}
