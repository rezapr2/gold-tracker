'use client';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { goldPriceApi } from '@/lib/api';
import { GoldPrice } from '@/types';
import { Metal, DEFAULT_METAL } from '@/lib/metals';
import { getSocket } from '@/lib/socket';
import {
  getPriceSnapshot,
  getServerPriceSnapshot,
  refetchPrice,
  subscribePrice,
} from '@/lib/priceStore';

/**
 * Live stats for a metal. Consumers render `stats` (which carries the current
 * price plus day/week high/low/change), so we fetch only /prices/stats — never
 * the redundant /prices/latest. All subscribers for the same metal share one
 * request, poll and socket listener via the price store, so mounting the ticker
 * and a panel for the same metal no longer doubles the network traffic.
 */
export function useLatestPrice(metal: Metal = DEFAULT_METAL) {
  const subscribe = useCallback((cb: () => void) => subscribePrice(metal, cb), [metal]);
  const snapshot = useSyncExternalStore(
    subscribe,
    () => getPriceSnapshot(metal),
    getServerPriceSnapshot,
  );
  const refetch = useCallback(() => refetchPrice(metal), [metal]);

  return { stats: snapshot.stats, loading: snapshot.loading, error: snapshot.error, refetch };
}

export function usePriceHistory(hours = 24, limit = 500, metal: Metal = DEFAULT_METAL) {
  const [history, setHistory] = useState<GoldPrice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    goldPriceApi
      .getHistory(hours, limit, metal)
      .then((res: any) => setHistory(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [hours, limit, metal]);

  return { history, loading };
}

export interface GoldSilverRatio {
  ratio: number;
  gold: number;
  silver: number;
  timestamp: string;
}

export function useGoldSilverRatio() {
  const [ratio, setRatio] = useState<GoldSilverRatio | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRatio = useCallback(() => {
    goldPriceApi
      .getRatio()
      .then((res: any) => setRatio(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchRatio();
    const socket = getSocket();
    socket.on('price:update', fetchRatio);
    const interval = setInterval(fetchRatio, 30000);
    return () => {
      socket.off('price:update', fetchRatio);
      clearInterval(interval);
    };
  }, [fetchRatio]);

  return { ratio, loading };
}

export interface MetalRecords {
  high: number;
  low: number;
  current: number;
  fromHighPercent: number;
  fromLowPercent: number;
  days: number;
}

export function useRecords(metal: Metal = DEFAULT_METAL) {
  const [records, setRecords] = useState<MetalRecords | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    goldPriceApi
      .getRecords(metal)
      .then((res: any) => setRecords(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [metal]);

  return { records, loading };
}

export function useCandlestickData(timeframe = '1d', metal: Metal = DEFAULT_METAL) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    goldPriceApi
      .getCandlestick(timeframe as any, metal)
      .then((res: any) => setData(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [timeframe, metal]);

  return { data, loading };
}
