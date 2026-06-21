import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HeartbeatEvent, ServiceStatus } from '@gold-tracker/shared';
import { ServiceRegistryEntry, ServiceRegistryDocument } from './schemas/service-registry.schema';

// An instance is considered healthy if its last beat is within this window.
const HEALTHY_WINDOW_MS = 25_000;

@Injectable()
export class RegistryService {
  constructor(
    @InjectModel(ServiceRegistryEntry.name)
    private readonly model: Model<ServiceRegistryDocument>,
  ) {}

  /** Upserts an instance's heartbeat. */
  async record(beat: HeartbeatEvent): Promise<void> {
    await this.model.updateOne(
      { instanceId: beat.instanceId },
      {
        $set: {
          service: beat.service,
          role: beat.role,
          version: beat.version,
          startedAt: beat.startedAt,
          lastSeen: new Date(beat.lastSeen),
          detail: beat.detail ?? {},
        },
      },
      { upsert: true },
    );
  }

  /** Groups live instances by service for the admin dashboard. */
  async list(): Promise<ServiceStatus[]> {
    const rows = await this.model.find().lean().exec();
    const now = Date.now();
    const byService = new Map<string, ServiceStatus>();

    for (const row of rows) {
      const healthy = now - new Date(row.lastSeen).getTime() < HEALTHY_WINDOW_MS;
      const group =
        byService.get(row.service) ??
        { service: row.service, role: row.role, healthy: false, instances: [] };
      group.instances.push({
        instanceId: row.instanceId,
        version: row.version,
        startedAt: row.startedAt,
        lastSeen: new Date(row.lastSeen).toISOString(),
        healthy,
        detail: row.detail,
      });
      group.healthy = group.healthy || healthy;
      byService.set(row.service, group);
    }

    return [...byService.values()].sort((a, b) => a.service.localeCompare(b.service));
  }
}
