import { GoldPriceRecord } from '../types';

/**
 * Emitted by a fetcher each time it reads a fresh price from a provider. Core
 * consumes this, dedups + computes change vs the last stored price, persists it,
 * and re-emits a PriceSavedEvent.
 */
export interface PriceFetchedEvent {
  asset: string;
  price: number;
  currency: string;
  provider: string;
  /** ISO string (JSON-safe over the wire); rehydrated to Date by the consumer. */
  timestamp: string;
  buyPrice?: number;
  sellPrice?: number;
  high?: number;
  low?: number;
  open?: number;
}

/** Emitted by core after a price is persisted. Drives WS + Telegram publishers. */
export interface PriceSavedEvent extends GoldPriceRecord {}

/** Emitted by core when a saved price crosses the configured alert threshold. */
export interface PriceAlertEvent {
  asset: string;
  price: number;
  changePercent: number;
  baseline: number;
}

/** Emitted by core after settings change so services re-pull + re-schedule. */
export interface SettingsChangedEvent {
  at: string;
}

/** Periodic liveness ping every service emits; core maintains the registry. */
export interface HeartbeatEvent {
  service: string;
  instanceId: string;
  role: string;
  version: string;
  startedAt: string;
  lastSeen: string;
  /** Role-specific status detail surfaced in the admin services view. */
  detail?: Record<string, unknown>;
}

/** Shape returned by the `services.list` RPC for the admin dashboard. */
export interface ServiceStatus {
  service: string;
  role: string;
  healthy: boolean;
  instances: Array<{
    instanceId: string;
    version: string;
    startedAt: string;
    lastSeen: string;
    healthy: boolean;
    detail?: Record<string, unknown>;
  }>;
}
