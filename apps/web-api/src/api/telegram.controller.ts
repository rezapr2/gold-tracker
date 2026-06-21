import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CoreClient } from '../core/core.client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Telegram admin endpoints — thin HTTP proxy over the telegram-bot RPC surface,
 * so the existing admin UI keeps the same routes. Status is public (the admin
 * overview polls it); mutations require auth.
 */
@ApiTags('telegram')
@Controller('telegram')
export class TelegramController {
  constructor(private readonly core: CoreClient) {}

  @Get('status')
  @ApiOperation({ summary: 'Get Telegram bot status' })
  async getStatus() {
    return { success: true, data: await this.core.telegramStatus() };
  }

  @Post('send')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Manually broadcast a price update to Telegram' })
  @ApiQuery({ name: 'metal', required: false })
  async sendUpdate(@Query('metal') metal?: string, @Body('channelId') channelId?: string) {
    return { success: true, data: await this.core.telegramSend(metal, channelId) };
  }

  @Post('send-summary')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Broadcast a daily summary to Telegram' })
  @ApiQuery({ name: 'metal', required: false })
  async sendSummary(@Query('metal') metal?: string, @Body('channelId') channelId?: string) {
    return { success: true, data: await this.core.telegramSendSummary(metal, channelId) };
  }

  @Get('logs')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get publish logs' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'metal', required: false })
  async getLogs(@Query('limit') limit = 20, @Query('metal') metal?: string) {
    return { success: true, data: await this.core.telegramLogs(+limit, metal) };
  }

  @Get('channels')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List configured channels' })
  @ApiQuery({ name: 'metal', required: false })
  async listChannels(@Query('metal') metal?: string) {
    const data: any = await this.core.telegramChannelsList(metal);
    return { success: true, data: data?.channels ?? data, placeholders: data?.placeholders };
  }

  @Put('channels')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or update a channel' })
  async upsertChannel(@Body() body: any) {
    return { success: true, data: await this.core.telegramChannelUpsert(body) };
  }

  @Delete('channels/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a channel' })
  async deleteChannel(@Param('id') id: string) {
    return { success: true, data: await this.core.telegramChannelDelete(id) };
  }
}
