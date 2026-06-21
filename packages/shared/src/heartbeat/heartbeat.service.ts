import { Inject, Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { randomUUID } from 'crypto';
import { RoutingKey } from '../contracts/patterns';
import { HeartbeatEvent } from '../contracts/events';

export const EVENTS_CLIENT = 'EVENTS_CLIENT';
export const HEARTBEAT_OPTIONS = 'HEARTBEAT_OPTIONS';

export interface HeartbeatOptions {
  service: string;
  version: string;
  intervalMs?: number;
}

/**
 * Emits a periodic `service.heartbeat` event so core can maintain the live
 * service registry shown in the admin dashboard. Each service supplies a
 * `detail` provider for role-specific status (last fetch, breaker state, bot
 * readiness, …) via {@link setDetailProvider}.
 */
@Injectable()
export class HeartbeatService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(HeartbeatService.name);
  private readonly instanceId = randomUUID();
  private readonly startedAt = new Date().toISOString();
  private timer?: NodeJS.Timeout;
  private detailProvider: () => Record<string, unknown> | Promise<Record<string, unknown>> = () => ({});

  constructor(
    @Inject(EVENTS_CLIENT) private readonly client: ClientProxy,
    @Inject(HEARTBEAT_OPTIONS) private readonly options: HeartbeatOptions,
  ) {}

  setDetailProvider(fn: () => Record<string, unknown> | Promise<Record<string, unknown>>): void {
    this.detailProvider = fn;
  }

  onApplicationBootstrap(): void {
    const interval = this.options.intervalMs ?? 10_000;
    void this.beat();
    this.timer = setInterval(() => void this.beat(), interval);
    this.logger.log(`Heartbeat started for ${this.options.service} (${this.instanceId})`);
  }

  private async beat(): Promise<void> {
    try {
      const detail = await this.detailProvider();
      const event: HeartbeatEvent = {
        service: this.options.service,
        instanceId: this.instanceId,
        role: this.options.service,
        version: this.options.version,
        startedAt: this.startedAt,
        lastSeen: new Date().toISOString(),
        detail,
      };
      this.client.emit(RoutingKey.ServiceHeartbeat, event);
    } catch (error: any) {
      this.logger.debug(`Heartbeat emit failed: ${error.message}`);
    }
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }
}
