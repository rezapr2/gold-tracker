import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { RoutingKey, PriceSavedEvent, PriceAlertEvent } from '@gold-tracker/shared';
import { WebsocketGateway } from './websocket.gateway';

/**
 * Bridges core's events to connected browsers: a saved price becomes a
 * `price:update` socket event, an alert becomes `price:alert`. The Redis socket
 * adapter fans these out across every web-api replica.
 */
@Controller()
export class WsEventsController {
  constructor(private readonly gateway: WebsocketGateway) {}

  @EventPattern(RoutingKey.PriceSaved)
  onPriceSaved(@Payload() price: PriceSavedEvent, @Ctx() ctx: RmqContext): void {
    this.ack(ctx);
    this.gateway.emitPriceUpdate(price);
  }

  @EventPattern(RoutingKey.PriceAlert)
  onPriceAlert(@Payload() alert: PriceAlertEvent, @Ctx() ctx: RmqContext): void {
    this.ack(ctx);
    this.gateway.emitAlert({ price: alert.price, changePercent: alert.changePercent });
  }

  private ack(ctx: RmqContext): void {
    ctx.getChannelRef().ack(ctx.getMessage());
  }
}
