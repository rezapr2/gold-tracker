import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { HeartbeatEvent, RoutingKey, Rpc, ServiceStatus } from '@gold-tracker/shared';
import { RegistryService } from './registry.service';

/** Consumes service heartbeats and answers the `services.list` RPC for admin. */
@Controller()
export class RegistryController {
  constructor(private readonly registry: RegistryService) {}

  @EventPattern(RoutingKey.ServiceHeartbeat)
  async onHeartbeat(@Payload() beat: HeartbeatEvent, @Ctx() ctx: RmqContext): Promise<void> {
    const channel = ctx.getChannelRef();
    const message = ctx.getMessage();
    try {
      await this.registry.record(beat);
    } finally {
      channel.ack(message);
    }
  }

  @MessagePattern(Rpc.ServicesList)
  list(): Promise<ServiceStatus[]> {
    return this.registry.list();
  }
}
