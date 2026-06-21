import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type ServiceRegistryDocument = ServiceRegistryEntry & Document;

/**
 * One row per running service instance, refreshed by its heartbeats. A TTL index
 * on `lastSeen` drops an instance ~30s after its last beat, so a crashed/killed
 * replica disappears from the admin services view automatically.
 */
@Schema({ collection: 'service_registry' })
export class ServiceRegistryEntry {
  @Prop({ required: true })
  service: string;

  @Prop({ required: true, unique: true })
  instanceId: string;

  @Prop()
  role: string;

  @Prop()
  version: string;

  @Prop()
  startedAt: string;

  @Prop({ required: true })
  lastSeen: Date;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  detail: Record<string, unknown>;
}

export const ServiceRegistrySchema = SchemaFactory.createForClass(ServiceRegistryEntry);

// Auto-expire stale instances ~30s after their last heartbeat (beats are ~10s).
ServiceRegistrySchema.index({ lastSeen: 1 }, { expireAfterSeconds: 30 });
ServiceRegistrySchema.index({ service: 1 });
