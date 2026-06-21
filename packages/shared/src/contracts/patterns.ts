/**
 * Stable names shared across every service: the logical service identities, the
 * RabbitMQ topology (exchange / event routing keys / per-consumer queues), and
 * the RPC message patterns core responds to. Keeping these in one place stops
 * the producer and consumer sides from drifting.
 */

/** Logical roles, used in heartbeats and the admin services view. */
export enum ServiceName {
  Core = 'core',
  FetcherMetals = 'fetcher-metals',
  FetcherEstjt = 'fetcher-estjt',
  WebApi = 'web-api',
  TelegramBot = 'telegram-bot',
}

/** Single topic exchange all fire-and-forget events flow through. */
export const EVENTS_EXCHANGE = 'gold.events';

/** Routing keys for events (topic exchange bindings). */
export const RoutingKey = {
  PriceFetched: 'price.fetched',
  PriceSaved: 'price.saved',
  PriceAlert: 'price.alert',
  SettingsChanged: 'settings.changed',
  ServiceHeartbeat: 'service.heartbeat',
} as const;
export type RoutingKey = (typeof RoutingKey)[keyof typeof RoutingKey];

/**
 * Durable queue each consumer binds. NestJS RMQ consumes a single queue per
 * microservice; we bind that queue to the routing keys the service cares about.
 * One queue per service keeps every consumer getting its own copy of an event.
 */
export const Queue = {
  Core: 'core.in',
  WebApi: 'webapi.in',
  TelegramBot: 'telegram.in',
  FetcherMetals: 'fetcher-metals.in',
  FetcherEstjt: 'fetcher-estjt.in',
} as const;

/** Which routing keys each service's queue subscribes to. */
export const QUEUE_BINDINGS: Record<string, RoutingKey[]> = {
  [Queue.Core]: [RoutingKey.PriceFetched, RoutingKey.ServiceHeartbeat],
  [Queue.WebApi]: [RoutingKey.PriceSaved, RoutingKey.SettingsChanged],
  [Queue.TelegramBot]: [RoutingKey.PriceSaved, RoutingKey.PriceAlert, RoutingKey.SettingsChanged],
  [Queue.FetcherMetals]: [RoutingKey.SettingsChanged],
  [Queue.FetcherEstjt]: [RoutingKey.SettingsChanged],
};

/** RPC message patterns core answers (request/response over RabbitMQ). */
export const Rpc = {
  PriceLatest: 'prices.latest',
  PriceHistory: 'prices.history',
  PriceHourly: 'prices.hourly',
  PriceDaily: 'prices.daily',
  PriceStats: 'prices.stats',
  PriceCandles: 'prices.candles',
  PriceRecords: 'prices.records',
  PriceRatio: 'prices.ratio',
  PriceExportCsv: 'prices.exportCsv',
  AnalyticsSummary: 'analytics.summary',
  AnalyticsSeries: 'analytics.series',
  SettingsGet: 'settings.get',
  SettingsUpdate: 'settings.update',
  ServicesList: 'services.list',
  // Telegram admin ops answered by the telegram-bot service.
  TelegramStatus: 'telegram.status',
  TelegramLogs: 'telegram.logs',
  TelegramSend: 'telegram.send',
  TelegramSendSummary: 'telegram.sendSummary',
  TelegramChannelsList: 'telegram.channels.list',
  TelegramChannelUpsert: 'telegram.channels.upsert',
  TelegramChannelDelete: 'telegram.channels.delete',
} as const;
export type Rpc = (typeof Rpc)[keyof typeof Rpc];
