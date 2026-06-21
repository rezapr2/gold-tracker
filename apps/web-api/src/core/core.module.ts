import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { rmqClientOptions, RMQ_URL_DEFAULT, EVENTS_CLIENT, Queue } from '@gold-tracker/shared';
import { CoreClient } from './core.client';

/**
 * Registers the RMQ client used for both RPC reads to core and the web-api
 * heartbeat emit. Global so every controller can inject {@link CoreClient}.
 */
@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: EVENTS_CLIENT,
        inject: [ConfigService],
        useFactory: (config: ConfigService) =>
          rmqClientOptions(config.get<string>('rabbitmq.url') || RMQ_URL_DEFAULT, Queue.WebApi),
      },
    ]),
  ],
  providers: [CoreClient],
  exports: [CoreClient, ClientsModule],
})
export class CoreModule {}
