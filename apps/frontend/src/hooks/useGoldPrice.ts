'use client';
import { useState, useEffect, useCallback } from 'react';
import { goldPriceApi } from '@/lib/api';
import { GoldPrice, PriceStats } from '@/types';
import { Metal, DEFAULT_METAL } from '@/lib/metals';
import { getSocket } from '@/lib/socket';

export function useLatestPrice(metal: Metal = DEFAULT_METAL) {
  const [price, setPrice] = useState<GoldPrice | null>(null);
  const [stats, setStats] = useState<PriceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [priceRes, statsRes] = await Promise.all([
        goldPriceApi.getLatest(metal) as any,
        goldPriceApi.getStats(metal) as any,
      ]);
      setPrice(priceRes.data);
      setStats(statsRes.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch price');
    } finally {
      setLoading(false);
    }
  }, [metal]);

  useEffect(() => {
    fetchData();

    const socket = getSocket();
    const handler = (newPrice: GoldPrice) => {
      // The gateway broadcasts updates for every metal; only react to ours.
      if (newPrice?.metal && newPrice.metal !== metal) return;
      setPrice(newPrice);
      fetchData();
    };
    socket.on('price:update', handler);

    const interval = setInterval(fetchData, 30000);

    return () => {
      socket.off('price:update', handler);
      clearInterval(interval);
    };
  }, [fetchData, metal]);

  return { price, stats, loading, error, refetch: fetchData };
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
