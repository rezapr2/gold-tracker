import { Controller, Get } from '@nestjs/common';

/** Minimal HTTP liveness probe for Docker. */
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'fetcher-metals',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
