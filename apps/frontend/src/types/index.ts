export interface GoldPrice {
  _id: string;
  price: number;
  buyPrice?: number;
  sellPrice?: number;
  high?: number;
  low?: number;
  open?: number;
  currency: string;
  metal: string;
  provider: string;
  changePercent?: number;
  changeAmount?: number;
  timestamp: string;
  createdAt: string;
}

export interface PriceStats {
  metal?: string;
  current: number;
  currency: string;
  timestamp: string;
  day: {
    high: number;
    low: number;
    open: number;
    changePercent: number;
    changeAmount: number;
  };
  week: {
    high: number;
    low: number;
    open: number;
    changePercent: number;
    changeAmount: number;
  };
}

export interface CandlestickData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface PriceStatistics {
  _id: string;
  period: 'hourly' | 'daily' | 'weekly' | 'monthly';
  periodStart: string;
  periodEnd: string;
  openPrice: number;
  closePrice: number;
  highPrice: number;
  lowPrice: number;
  averagePrice: number;
  changePercent: number;
  changeAmount: number;
  volatility: number;
  dataPoints: number;
}

export interface TelegramStatus {
  isEnabled: boolean;
  lastPublish: string | null;
  totalSent: number;
  totalFailed: number;
}

export interface PublishLog {
  _id: string;
  type: 'scheduled' | 'manual' | 'alert' | 'daily_summary';
  status: 'success' | 'failed' | 'pending';
  channelId: string;
  messageText?: string;
  goldPrice?: number;
  changePercent?: number;
  errorMessage?: string;
  createdAt: string;
}

export interface TelegramChannelConfig {
  _id?: string;
  channelId: string;
  metal: 'XAU' | 'XAG';
  name?: string;
  template?: string;
  language?: 'en' | 'fa';
  enabled: boolean;
  sendCharts?: boolean;
}

export interface TelegramBotOverride {
  token?: string;
  channelId?: string;
}

export interface BotSettings {
  /** Per-asset bot token + channel, keyed by asset code (e.g. XAU, XAG). */
  telegramBots: Record<string, TelegramBotOverride>;
  telegramSendCharts: boolean;
  telegramCommandsEnabled: boolean;
  priceFetchInterval: string;
  telegramPublishInterval: string;
  priceAlertThreshold: number;
  telegramEnabled: boolean;
  alertsEnabled: boolean;
  language: 'en' | 'fa';
  goldApiKey: string;
  metalsDevKey: string;
  twelveDataKey: string;
  alphaVantageKey: string;
  dataRetentionDays: number;
}

export type Timeframe = '1h' | '4h' | '1d' | '7d' | '30d';
