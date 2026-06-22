import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { RmqContext } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Acks request/response (`@MessagePattern`) messages.
 *
 * The consumer runs with `noAck: false` so event handlers can manually ack and a
 * crash re-queues the event (see `rmq.ts`). But NestJS's RMQ server never acks
 * the **RPC** path — it sends the reply and returns without acking. With manual
 * ack on, those requests stay unacked forever; once `prefetchCount` of them
 * accumulate the broker stops delivering and the whole consumer wedges.
 *
 * This interceptor closes that gap: for request/response messages (identified by
 * a `replyTo`) it acks on success and dead-letters on error. Events carry no
 * `replyTo`, so they pass through untouched and keep their own manual ack.
 */
@Injectable()
export class RmqAckInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'rpc') return next.handle();

    const rmq = context.switchToRpc().getContext<RmqContext>();
    const message = rmq?.getMessage?.();
    // Only request/response messages have a replyTo; events do not (they manage
    // their own ack inside the handler).
    if (!message?.properties?.replyTo) return next.handle();

    const channel = rmq.getChannelRef();
    return next.handle().pipe(
      tap({
        next: () => channel.ack(message),
        error: () => channel.nack(message, false, false),
      }),
    );
  }
}
