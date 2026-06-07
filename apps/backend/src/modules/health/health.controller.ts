import { Controller, Get, Optional } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(@Optional() @InjectConnection() private readonly connection?: Connection) {}

  @Get()
  @ApiOperation({ summary: 'Liveness/readiness probe' })
  check() {
    // Mongoose readyState: 1 = connected, 2 = connecting, etc.
    const dbConnected = this.connection?.readyState === 1;
    return {
      status: dbConnected ? 'ok' : 'degraded',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      services: {
        database: dbConnected ? 'up' : 'down',
      },
    };
  }
}
