import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TelegramService } from './telegram.service';
import { TelegramChannelService } from './telegram-channel.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PublishType } from './schemas/publish-log.schema';
import { TEMPLATE_PLACEHOLDERS } from './message-template';
import { toMetal } from '../gold-price/metal.types';

@ApiTags('telegram')
@Controller('telegram')
export class TelegramController {
  constructor(
    private readonly telegramService: TelegramService,
    private readonly channelService: TelegramChannelService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Get Telegram bot status (per metal)' })
  async getStatus() {
    const status = await this.telegramService.getBotStatus();
    return { success: true, data: status };
  }

  @Post('send')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Manually broadcast a price update to Telegram' })
  @ApiQuery({ name: 'metal', required: false, enum: ['XAU', 'XAG'] })
  async sendUpdate(@Query('metal') metal?: string, @Body('channelId') channelId?: string) {
    const logs = await this.telegramService.sendPriceUpdate(toMetal(metal), channelId, PublishType.MANUAL);
    return { success: true, data: logs };
  }

  @Post('send-summary')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Broadcast a daily summary to Telegram' })
  @ApiQuery({ name: 'metal', required: false, enum: ['XAU', 'XAG'] })
  async sendSummary(@Query('metal') metal?: string, @Body('channelId') channelId?: string) {
    const logs = await this.telegramService.sendDailySummary(toMetal(metal), channelId);
    return { success: true, data: logs };
  }

  @Get('logs')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get publish logs' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'metal', required: false, enum: ['XAU', 'XAG'] })
  async getLogs(@Query('limit') limit: number = 20, @Query('metal') metal?: string) {
    const logs = await this.telegramService.getPublishLogs(+limit, metal ? toMetal(metal) : undefined);
    return { success: true, data: logs };
  }

  // ---- Channel management ---------------------------------------------------

  @Get('channels')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List configured channels' })
  @ApiQuery({ name: 'metal', required: false, enum: ['XAU', 'XAG'] })
  async listChannels(@Query('metal') metal?: string) {
    const channels = await this.channelService.list(metal ? toMetal(metal) : undefined);
    return { success: true, data: channels, placeholders: TEMPLATE_PLACEHOLDERS };
  }

  @Put('channels')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or update a channel (with optional message template)' })
  async upsertChannel(@Body() body: any) {
    const channel = await this.channelService.upsert({ ...body, metal: toMetal(body?.metal) });
    return { success: true, data: channel };
  }

  @Delete('channels/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a channel' })
  async deleteChannel(@Param('id') id: string) {
    const result = await this.channelService.remove(id);
    return { success: true, data: result };
  }
}
