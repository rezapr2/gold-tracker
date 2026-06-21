import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CoreClient } from '../core/core.client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/** Admin-only view of every running microservice (status + role-specific detail). */
@ApiTags('admin')
@Controller('admin')
export class ServicesController {
  constructor(private readonly core: CoreClient) {}

  @Get('services')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all microservices and their live status' })
  async services() {
    return { success: true, data: await this.core.servicesList() };
  }
}
