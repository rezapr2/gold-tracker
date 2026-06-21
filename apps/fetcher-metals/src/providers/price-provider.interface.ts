import { Asset } from '@gold-tracker/shared';

/**
 * A single price observation as returned by any provider.
 *
 * The `metal` field name is retained (it maps to the DB `metal` column) even
 * though the value is really any asset id — see asset.types.ts for the soft
 * metal → asset rename.
 */
export interface GoldPriceData {
  price: number;
  buyPrice?: number;
  sellPrice?: number;
  high?: number;
  low?: number;
  open?: number;
  currency: string;
  metal: string;
  provider: string;
  timestamp: Date;
  changePercent?: number;
  changeAmount?: number;
}

/**
 * Common shape for every price source. `supports()` lets the service skip
 * providers that can't serve a given asset (declared per-asset in the registry),
 * so the failover loop only tries relevant sources — e.g. a metals-only API is
 * never asked for crude oil.
 */
export interface PriceProvider {
  /** Stable id, matched against an asset's `providers` list in the registry. */
  readonly name: string;
  supports(asset: Asset): boolean;
  fetchPrice(asset: Asset): Promise<GoldPriceData | null>;
  fetchHistory?(
    interval: string,
    outputsize: number,
    asset: Asset,
  ): Promise<GoldPriceData[] | null>;
}
