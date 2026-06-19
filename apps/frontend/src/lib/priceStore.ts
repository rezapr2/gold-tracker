'use client';
import { goldPriceApi } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import type { GoldPrice, PriceStats } from '@/types';

/**
 * Shared, reference-counted price-stats store keyed by metal.
 *
 * The homepage mounts several widgets that all want the same metal's stats
 * (the ticker, the price card, the stats grid…). Without coordination each one
 * would fire its own /prices/stats request, run its own 30s poll and attach its
 * own socket handler. This store collapses all subscribers for a given metal
 * onto a single request, a single poll interval and a single socket listener,
 * tearing them down when the last subscriber unmounts. Consumed via
 * `useLatestPrice` through React's `useSyncExternalStore`.
 */

export interface PriceSnapshot {
  stats: PriceStats | null;
  loading: boolean;
  error: string | null;
}

const POLL_MS = 30_000;
const INITIAL: PriceSnapshot = { stats: null, loading: true, error: null };

interface Entry {
  snapshot: PriceSnapshot;
  listeners: Set<() => void>;
  interval: ReturnType<typeof setInterval> | null;
  socketHandler: ((p: GoldPrice) => void) | null;
  inFlight: Promise<void> | null;
}

const entries = new Map<string, Entry>();

function getEntry(metal: string): Entry {
  let entry = entries.get(metal);
  if (!entry) {
    entry = { snapshot: INITIAL, listeners: new Set(), interval: null, socketHandler: null, inFlight: null };
    entries.set(metal, entry);
  }
  return entry;
}

function update(entry: Entry, patch: Partial<PriceSnapshot>) {
  entry.snapshot = { ...entry.snapshot, ...patch };
  entry.listeners.forEach((listener) => listener());
}

function fetchStats(metal: string): Promise<void> {
  const entry = getEntry(metal);
  // Coalesce concurrent fetches (e.g. a poll tick racing a socket update).
  if (entry.inFlight) return entry.inFlight;
  entry.inFlight = (async () => {
    try {
      const res = (await goldPriceApi.getStats(metal)) as any;
      update(entry, { stats: res.data, loading: false, error: null });
    } catch (err: any) {
      update(entry, { loading: false, error: err?.message || 'Failed to fetch price' });
    } finally {
      entry.inFlight = null;
    }
  })();
  return entry.inFlight;
}

export function subscribePrice(metal: string, listener: () => void): () => void {
  const entry = getEntry(metal);
  entry.listeners.add(listener);

  // First subscriber for this metal: start the shared poll + socket handler.
  if (entry.listeners.size === 1) {
    void fetchStats(metal);
    const socket = getSocket();
    const handler = (newPrice: GoldPrice) => {
      // The gateway broadcasts every metal; only react to ours.
      if (newPrice?.metal && newPrice.metal !== metal) return;
      void fetchStats(metal);
    };
    socket.on('price:update', handler);
    entry.socketHandler = handler;
    entry.interval = setInterval(() => void fetchStats(metal), POLL_MS);
  }

  return () => {
    entry.listeners.delete(listener);
    // Last subscriber gone: stop polling and detach the socket handler.
    if (entry.listeners.size === 0) {
      if (entry.interval) clearInterval(entry.interval);
      if (entry.socketHandler) getSocket().off('price:update', entry.socketHandler);
      entry.interval = null;
      entry.socketHandler = null;
    }
  };
}

export function getPriceSnapshot(metal: string): PriceSnapshot {
  return entries.get(metal)?.snapshot ?? INITIAL;
}

/** Server snapshot for SSR/hydration — always the loading placeholder. */
export function getServerPriceSnapshot(): PriceSnapshot {
  return INITIAL;
}

export function refetchPrice(metal: string): void {
  void fetchStats(metal);
}
