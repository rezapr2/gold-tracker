import { Controller, Get, Optional } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

/** Minimal HTTP liveness probe so Docker can health-check the core service. */
@Controller('health')
export class HealthController {
  constructor(@Optional() @InjectConnection() private readonly connection?: Connection) {}

  @Get()
  check() {
    const dbConnected = this.connection?.readyState === 1;
    return {
      status: dbConnected ? 'ok' : 'degraded',
      service: 'core',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      services: { database: dbConnected ? 'up' : 'down' },
    };
  }
}
