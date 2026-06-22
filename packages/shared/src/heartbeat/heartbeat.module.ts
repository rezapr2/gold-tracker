import { DynamicModule, Module } from '@nestjs/common';
import { HeartbeatOptions, HeartbeatService, HEARTBEAT_OPTIONS } from './heartbeat.service';

/**
 * Provides the heartbeat emitter. The app must also register an `EVENTS_CLIENT`
 * ClientProxy (via ClientsModule) for the emitter to publish through.
 */
@Module({})
export class HeartbeatModule {
  static forRoot(options: HeartbeatOptions): DynamicModule {
    return {
      module: HeartbeatModule,
      global: true,
      providers: [
        { provide: HEARTBEAT_OPTIONS, useValue: options },
        HeartbeatService,
      ],
      exports: [HeartbeatService],
    };
  }
}
