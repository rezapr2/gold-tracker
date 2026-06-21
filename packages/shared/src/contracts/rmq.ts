import { RmqOptions, Transport } from '@nestjs/microservices';
import { EVENTS_EXCHANGE } from './patterns';

/**
 * Shared RabbitMQ wiring so every service connects the same way.
 *
 * We use a single topic exchange (`gold.events`) with `wildcards: true`, so the
 * message pattern passed to `emit()` / `@EventPattern()` / `@MessagePattern()`
 * doubles as the routing key. NestJS binds each microservice's durable queue to
 * the exchange for every pattern it registers a handler for — so core's queue
 * ends up bound to `price.fetched` + `service.heartbeat` + all the RPC patterns,
 * web-api's to `price.saved` + `settings.changed`, etc. Manual ack
 * (`noAck: false`) so a crash re-queues a message rather than dropping it.
 */
function baseOptions(url: string, queue: string) {
  return {
    urls: [url],
    exchange: EVENTS_EXCHANGE,
    exchangeType: 'topic' as const,
    wildcards: true,
    queue,
    noAck: false,
    prefetchCount: 10,
    queueOptions: {
      durable: true,
      // Dead-letter to a per-queue DLQ so poison messages stay inspectable.
      arguments: {
        'x-dead-letter-exchange': '',
        'x-dead-letter-routing-key': `${queue}.dlq`,
      },
    },
  };
}

/** Options for a service that consumes its queue (events and/or RPC handlers). */
export function rmqMicroserviceOptions(url: string, queue: string): RmqOptions {
  return { transport: Transport.RMQ, options: baseOptions(url, queue) as any };
}

/** Options for a ClientProxy that emits events / sends RPCs to the exchange. */
export function rmqClientOptions(url: string, queue: string): RmqOptions {
  return { transport: Transport.RMQ, options: baseOptions(url, queue) as any };
}

export const RMQ_URL_DEFAULT = 'amqp://localhost:5672';
