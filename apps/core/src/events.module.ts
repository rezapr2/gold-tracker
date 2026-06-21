import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { rmqClientOptions, RMQ_URL_DEFAULT, EVENTS_CLIENT, Queue } from '@gold-tracker/shared';

/**
 * Registers the shared EVENTS_CLIENT ClientProxy core uses to emit price.saved /
 * price.alert / settings.changed to the topic exchange. Global so ingest,
 * lifecycle, registry and the RPC controllers can all inject it.
 */
@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: EVENTS_CLIENT,
        inject: [ConfigService],
        useFactory: (config: ConfigService) =>
          rmqClientOptions(config.get<string>('rabbitmq.url') || RMQ_URL_DEFAULT, Queue.Core),
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class EventsModule {}
