export interface GoldPriceRecord {
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
  timestamp: Date;
  isHourlyAggregate?: boolean;
  isDailyAggregate?: boolean;
}

export interface PriceStatsRecord {
  current: number;
  currency: string;
  timestamp: Date;
  day: PricePeriodStats;
  week: PricePeriodStats;
}

export interface PricePeriodStats {
  high: number;
  low: number;
  open: number;
  changePercent: number;
  changeAmount: number;
}

export type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};
