import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import TelegramBot from 'node-telegram-bot-api';
import { PublishLog, PublishLogDocument, PublishType, PublishStatus } from './schemas/publish-log.schema';
import { CoreClient } from '../core/core.client';
import { ChartImageService } from './chart-image.service';
import { TelegramChannelService } from './telegram-channel.service';
import { buildTemplateContext, renderTemplate } from './message-template';
import { Metal, METALS, DEFAULT_METAL, METAL_NAMES, METAL_EMOJIS } from '@gold-tracker/shared';
import { SettingsStoreService } from '../settings/settings-store.service';
import { format } from 'date-fns';

interface ChannelTarget {
  channelId: string;
  template?: string;
  sendCharts?: boolean;
}

/**
 * Runs an independent Telegram bot per metal (gold + silver, separate tokens).
 * Each metal can broadcast to multiple channels, and each channel can carry its
 * own message pattern (template). Optionally answers /gold /silver /ratio
 * commands when interactive mode is enabled.
 */
@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private readonly bots = new Map<Metal, TelegramBot>();

  constructor(
    @InjectModel(PublishLog.name) private publishLogModel: Model<PublishLogDocument>,
    private configService: ConfigService,
    private goldPriceService: CoreClient,
    private chartImageService: ChartImageService,
    private channelService: TelegramChannelService,
    private settings: SettingsStoreService,
  ) {}

  async onModuleInit() {
    await this.reinitializeBots();
  }

  /** Re-initialises every metal's bot from current settings (admin save / boot). */
  async reinitializeBots(): Promise<void> {
    for (const metal of METALS) {
      await this.initializeBot(metal);
    }
  }

  private metalConfig(metal: Metal): Promise<{ token?: string; channelId?: string }> {
    return this.settings.telegram(metal);
  }

  private commandsEnabled(): Promise<boolean> {
    return this.settings.commandsEnabled();
  }

  private chartsEnabled(): Promise<boolean> {
    return this.settings.sendCharts();
  }

  /** (Re)initialises the bot for a given metal. Token defaults to settings. */
  async initializeBot(metal: Metal = DEFAULT_METAL, token?: string) {
    const botToken = token || (await this.metalConfig(metal)).token;
    const name = METAL_NAMES[metal];

    // Stop any running bot first, so disabling a token actually tears it down.
    const existing = this.bots.get(metal);
    if (existing) {
      try {
        await existing.stopPolling();
      } catch {
        /* ignore */
      }
      this.bots.delete(metal);
    }

    if (!botToken) {
      this.logger.warn(`${name} Telegram bot token not configured`);
      return;
    }

    try {
      const polling = await this.commandsEnabled();
      const bot = new TelegramBot(botToken, { polling });
      if (polling) this.registerCommands(bot);

      this.bots.set(metal, bot);
      this.logger.log(`${name} Telegram bot initialized${polling ? ' (interactive)' : ''}`);
    } catch (error) {
      this.logger.error(`Failed to initialize ${name} Telegram bot: ${error.message}`);
    }
  }

  isReady(metal: Metal = DEFAULT_METAL): boolean {
    return this.bots.has(metal);
  }

  // ---- Interactive commands -------------------------------------------------

  private registerCommands(bot: TelegramBot) {
    bot.onText(/^\/(start|help)/, (msg) => {
      void bot.sendMessage(
        msg.chat.id,
        '🥇🥈 <b>Commands</b>\n/gold — gold price\n/silver — silver price\n/ratio — gold/silver ratio',
        { parse_mode: 'HTML' },
      );
    });
    bot.onText(/^\/gold\b/, (msg) => this.replyWithPrice(bot, msg.chat.id, 'XAU'));
    bot.onText(/^\/silver\b/, (msg) => this.replyWithPrice(bot, msg.chat.id, 'XAG'));
    bot.onText(/^\/ratio\b/, (msg) => this.replyWithRatio(bot, msg.chat.id));
  }

  private async replyWithPrice(bot: TelegramBot, chatId: number | string, metal: Metal) {
    try {
      const stats = await this.goldPriceService.getPriceStats(metal);
      const text = stats
        ? this.formatPriceMessage(metal, stats)
        : `No ${METAL_NAMES[metal]} data available yet.`;
      await bot.sendMessage(chatId, text, { parse_mode: 'HTML', disable_web_page_preview: true });
    } catch (error) {
      this.logger.error(`Command /${metal} reply failed: ${error.message}`);
    }
  }

  private async replyWithRatio(bot: TelegramBot, chatId: number | string) {
    try {
      const r = await this.goldPriceService.getGoldSilverRatio();
      const text = r
        ? `<b>⚖️ Gold/Silver Ratio:</b> ${r.ratio.toFixed(1)}\n🥇 $${r.gold.toFixed(2)} · 🥈 $${r.silver.toFixed(2)}`
        : 'Ratio unavailable — need both gold and silver prices.';
      await bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    } catch (error) {
      this.logger.error(`Command /ratio reply failed: ${error.message}`);
    }
  }

  // ---- Broadcasting ---------------------------------------------------------

  /** Resolves all target channels for a metal: env default + enabled DB channels. */
  private async resolveTargets(metal: Metal): Promise<ChannelTarget[]> {
    const byId = new Map<string, ChannelTarget>();

    const envChannel = (await this.metalConfig(metal)).channelId;
    if (envChannel) byId.set(envChannel, { channelId: envChannel });

    const dbChannels = await this.channelService.listEnabled(metal);
    for (const c of dbChannels) {
      byId.set(c.channelId, {
        channelId: c.channelId,
        template: c.template || undefined,
        sendCharts: typeof c.sendCharts === 'boolean' ? c.sendCharts : undefined,
      });
    }

    return [...byId.values()];
  }

  async sendPriceUpdate(
    metal: Metal = DEFAULT_METAL,
    channelId?: string,
    type: PublishType = PublishType.SCHEDULED,
  ): Promise<PublishLog[]> {
    const stats = await this.goldPriceService.getPriceStats(metal);
    if (!stats) throw new Error(`No ${metal} price data available`);

    const ratio = await this.goldPriceService.getGoldSilverRatio().catch(() => null);
    const context = buildTemplateContext(metal, stats, ratio?.ratio);
    const defaultText = this.formatPriceMessage(metal, stats);
    const title = `${METAL_NAMES[metal]} (${metal}/USD) — 30 Day Trend`;

    return this.broadcast(metal, channelId, type, defaultText, context, title, stats.current, stats.day?.changePercent);
  }

  async sendDailySummary(metal: Metal = DEFAULT_METAL, channelId?: string): Promise<PublishLog[]> {
    const stats = await this.goldPriceService.getPriceStats(metal);
    if (!stats) throw new Error(`No ${metal} price data available`);

    const ratio = await this.goldPriceService.getGoldSilverRatio().catch(() => null);
    const context = buildTemplateContext(metal, stats, ratio?.ratio);
    const defaultText = this.formatDailySummary(metal, stats);
    const title = `${METAL_NAMES[metal]} (${metal}/USD) — 30 Day Summary`;

    return this.broadcast(metal, channelId, PublishType.DAILY_SUMMARY, defaultText, context, title, stats.current, stats.day?.changePercent);
  }

  async sendAlert(metal: Metal, price: number, changePercent: number, channelId?: string): Promise<PublishLog[]> {
    const direction = changePercent > 0 ? '📈' : '📉';
    const text = this.formatAlertMessage(metal, price, changePercent, direction);
    // Alerts are urgent and text-only; templates/charts don't apply.
    const targets = channelId ? [{ channelId }] : await this.resolveTargets(metal);
    if (!targets.length) return [];
    return Promise.all(
      targets.map((t) => this.dispatch(metal, t.channelId, text, PublishType.ALERT, price, changePercent)),
    );
  }

  /** Renders per-channel templates (or default text) and dispatches to every target. */
  private async broadcast(
    metal: Metal,
    channelId: string | undefined,
    type: PublishType,
    defaultText: string,
    context: Record<string, string>,
    chartTitle: string,
    price?: number,
    changePercent?: number,
  ): Promise<PublishLog[]> {
    const targets = channelId ? [{ channelId } as ChannelTarget] : await this.resolveTargets(metal);
    if (!targets.length) {
      return [await this.dispatch(metal, undefined, defaultText, type, price, changePercent)];
    }

    // Build the chart at most once and reuse it across channels that want it.
    const globalCharts = await this.chartsEnabled();
    const anyChart = targets.some((t) => t.sendCharts ?? globalCharts);
    const image = anyChart ? await this.buildTrendImage(metal, chartTitle, changePercent) : undefined;

    return Promise.all(
      targets.map((t) => {
        const text = t.template ? renderTemplate(t.template, context) : defaultText;
        const useImage = (t.sendCharts ?? globalCharts) ? image : undefined;
        return this.dispatch(metal, t.channelId, text, type, price, changePercent, useImage);
      }),
    );
  }

  /**
   * Builds a 30-day trend chart image. Returns undefined (so the caller falls
   * back to text) when there's no data or rendering fails.
   */
  private async buildTrendImage(metal: Metal, title: string, changePercent?: number): Promise<Buffer | undefined> {
    try {
      const candles = await this.goldPriceService.getCandlestickData('30d', metal);
      const points = candles.map((c: any) => ({ time: c.time, value: c.close }));
      if (!points.length) return undefined;
      const image = await this.chartImageService.generateGoldChart(points, { title, changePercent });
      return image ?? undefined;
    } catch (error) {
      this.logger.warn(`Chart image generation failed for ${metal}: ${error.message}`);
      return undefined;
    }
  }

  /** Inline "Open Dashboard" button, deep-linked to the metal's view. */
  private dashboardKeyboard(metal: Metal): any {
    const base = this.configService.get<string>('frontendUrl');
    if (!base) return undefined;
    return { inline_keyboard: [[{ text: '📊 Open Live Dashboard', url: `${base}?metal=${metal}` }]] };
  }

  private async dispatch(
    metal: Metal,
    channelId: string | undefined,
    text: string,
    type: PublishType,
    goldPrice?: number,
    changePercent?: number,
    image?: Buffer,
  ): Promise<PublishLog> {
    const bot = this.bots.get(metal);

    const log = await this.publishLogModel.create({
      metal,
      type,
      status: PublishStatus.PENDING,
      channelId,
      messageText: text,
      goldPrice,
      changePercent,
      retryCount: 0,
    });

    if (!bot || !channelId) {
      await this.publishLogModel.findByIdAndUpdate(log._id, {
        status: PublishStatus.FAILED,
        errorMessage: `${METAL_NAMES[metal]} Telegram bot/channel not configured`,
      });
      return log;
    }

    try {
      const replyMarkup = this.dashboardKeyboard(metal);
      let sent: TelegramBot.Message;

      if (image) {
        sent = await bot.sendPhoto(
          channelId,
          image,
          { caption: text, parse_mode: 'HTML', reply_markup: replyMarkup },
          { filename: `${metal.toLowerCase()}-chart.png`, contentType: 'image/png' },
        );
      } else {
        sent = await bot.sendMessage(channelId, text, {
          parse_mode: 'HTML',
          disable_web_page_preview: true,
          reply_markup: replyMarkup,
        });
      }

      await this.publishLogModel.findByIdAndUpdate(log._id, {
        status: PublishStatus.SUCCESS,
        messageId: sent.message_id.toString(),
      });

      this.logger.log(`${metal} message sent to ${channelId}, type: ${type}${image ? ' (with chart)' : ''}`);
    } catch (error) {
      this.logger.error(`Failed to send ${metal} Telegram message: ${error.message}`);
      await this.publishLogModel.findByIdAndUpdate(log._id, {
        status: PublishStatus.FAILED,
        errorMessage: error.message,
      });
    }

    return log;
  }

  // ---- Default message formatting -------------------------------------------

  private formatPriceMessage(metal: Metal, stats: any): string {
    const { current, day, week } = stats;
    const dayEmoji = day?.changePercent >= 0 ? '📈' : '📉';
    const weekEmoji = week?.changePercent >= 0 ? '📈' : '📉';
    const name = METAL_NAMES[metal];

    return `
<b>${METAL_EMOJIS[metal]} ${name} Market Update</b>

<b>Current Price:</b> $${current?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <i>(${metal}/USD)</i>

${dayEmoji} <b>24H Change:</b> ${day?.changePercent >= 0 ? '+' : ''}${day?.changePercent?.toFixed(2)}% ($${day?.changeAmount?.toFixed(2)})
${weekEmoji} <b>7D Change:</b> ${week?.changePercent >= 0 ? '+' : ''}${week?.changePercent?.toFixed(2)}% ($${week?.changeAmount?.toFixed(2)})

📊 <b>Today's Range</b>
• High: $${day?.high?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
• Low: $${day?.low?.toLocaleString('en-US', { minimumFractionDigits: 2 })}

🕐 <i>${format(new Date(), 'MMM dd, yyyy HH:mm')} UTC</i>
    `.trim();
  }

  private formatAlertMessage(metal: Metal, price: number, changePercent: number, emoji: string): string {
    const name = METAL_NAMES[metal];
    return `
<b>${emoji} ${name} Price Alert!</b>

<b>Current Price:</b> $${price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <i>(${metal}/USD)</i>
<b>Change:</b> ${changePercent >= 0 ? '+' : ''}${changePercent?.toFixed(2)}%

⚠️ <i>Significant price movement detected</i>
🕐 <i>${format(new Date(), 'MMM dd, yyyy HH:mm')} UTC</i>
    `.trim();
  }

  private formatDailySummary(metal: Metal, stats: any): string {
    const { current, day, week } = stats;
    const name = METAL_NAMES[metal];

    return `
<b>${METAL_EMOJIS[metal]} Daily ${name} Market Summary</b>

<b>Closing Price:</b> $${current?.toLocaleString('en-US', { minimumFractionDigits: 2 })} <i>(${metal}/USD)</i>

📅 <b>Today's Performance</b>
• Open: $${day?.open?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
• Close: $${current?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
• High: $${day?.high?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
• Low: $${day?.low?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
• Change: ${day?.changePercent >= 0 ? '📈' : '📉'} ${day?.changePercent >= 0 ? '+' : ''}${day?.changePercent?.toFixed(2)}%

📆 <b>Weekly Performance</b>
• Change: ${week?.changePercent >= 0 ? '📈' : '📉'} ${week?.changePercent >= 0 ? '+' : ''}${week?.changePercent?.toFixed(2)}%

<i>${format(new Date(), 'EEEE, MMMM dd, yyyy')}</i>
    `.trim();
  }

  // ---- Status / logs --------------------------------------------------------

  async getPublishLogs(limit: number = 20, metal?: Metal): Promise<PublishLog[]> {
    const filter = metal ? { metal } : {};
    return this.publishLogModel.find(filter).sort({ createdAt: -1 }).limit(limit).lean().exec();
  }

  async getLastPublish(metal?: Metal): Promise<PublishLog | null> {
    const filter = { status: PublishStatus.SUCCESS, ...(metal ? { metal } : {}) };
    return this.publishLogModel.findOne(filter).sort({ createdAt: -1 }).lean().exec();
  }

  async getBotStatus(): Promise<any> {
    const [lastPublish, totalSent, totalFailed] = await Promise.all([
      this.getLastPublish(),
      this.publishLogModel.countDocuments({ status: PublishStatus.SUCCESS }),
      this.publishLogModel.countDocuments({ status: PublishStatus.FAILED }),
    ]);

    const bots: Record<string, { enabled: boolean }> = {};
    for (const metal of METALS) bots[metal] = { enabled: this.isReady(metal) };

    return {
      isEnabled: this.bots.size > 0,
      commandsEnabled: await this.commandsEnabled(),
      bots,
      lastPublish: lastPublish?.createdAt,
      totalSent,
      totalFailed,
    };
  }
}
