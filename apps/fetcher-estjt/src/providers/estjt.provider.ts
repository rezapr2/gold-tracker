import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { GoldPriceData, PriceProvider } from './price-provider.interface';
import { Asset, DEFAULT_ASSET, getAsset, symbolFor } from '@gold-tracker/shared';

/**
 * Tehran Gold & Jewelry Union (estjt.ir) scraper — the price source for the
 * Iranian coin / gram-gold instruments (IR_* assets), all quoted in Toman.
 *
 * The union publishes a single server-rendered table holding every row, so one
 * HTTP fetch yields all assets. fetchPrice() is called once per asset per cycle
 * by the scheduler, so the parsed table is memoised for a window shorter than
 * the fetch interval: the first asset of a cycle triggers the request and the
 * rest read the cache. Concurrent calls share one in-flight request.
 */
@Injectable()
export class EstjtProvider implements PriceProvider {
  readonly name = 'estjt';
  private readonly logger = new Logger(EstjtProvider.name);

  // Cache the parsed table just under the 1-minute price-fetch cadence so each
  // cycle does exactly one network round-trip regardless of how many IR_* assets
  // are tracked.
  private static readonly CACHE_TTL_MS = 45_000;
  private cache: { at: number; table: Map<string, number> } | null = null;
  private inflight: Promise<Map<string, number>> | null = null;

  constructor(private configService: ConfigService) {}

  supports(asset: Asset): boolean {
    return getAsset(asset).providers.includes(this.name);
  }

  async fetchPrice(asset: Asset = DEFAULT_ASSET): Promise<GoldPriceData | null> {
    const label = normalizeLabel(symbolFor(asset, this.name));

    let table: Map<string, number>;
    try {
      table = await this.getTable();
    } catch (error) {
      this.logger.error(`estjt.ir fetch failed: ${error.message}`);
      return null;
    }

    const price = table.get(label);
    if (price == null) {
      this.logger.warn(`estjt.ir: row "${label}" not found for ${asset}`);
      return null;
    }

    return {
      price,
      currency: getAsset(asset).quoteCurrency,
      metal: asset,
      provider: 'estjt.ir',
      timestamp: new Date(),
    };
  }

  private getTable(): Promise<Map<string, number>> {
    if (this.cache && Date.now() - this.cache.at < EstjtProvider.CACHE_TTL_MS) {
      return Promise.resolve(this.cache.table);
    }
    if (!this.inflight) {
      this.inflight = this.fetchTable()
        .then((table) => {
          this.cache = { at: Date.now(), table };
          return table;
        })
        .finally(() => {
          this.inflight = null;
        });
    }
    return this.inflight;
  }

  private async fetchTable(): Promise<Map<string, number>> {
    const url = this.configService.get<string>('apis.estjt.url');
    const response = await axios.get<string>(url, {
      timeout: 10000,
      responseType: 'text',
      // Some hosts return an empty body to clients without a browser UA.
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; gold-tracker/1.0)' },
    });
    return parsePriceTable(response.data);
  }
}

/**
 * Parses the estjt.ir price table into a label -> Toman value map.
 *
 * Each row is `<span class="label">NAME</span><span class="amount …">VALUE</span>`.
 * Labels are normalised (see {@link normalizeLabel}) so lookups are resilient to
 * Persian/Arabic letter and digit-form differences; values have their grouping
 * commas, currency signs and any Persian digits stripped to a plain integer.
 */
export function parsePriceTable(html: string): Map<string, number> {
  const table = new Map<string, number>();
  const rowRe =
    /<span class="label">([^<]+)<\/span>\s*<span class="amount[^"]*">\s*([^<]+?)\s*<\/span>/g;

  let match: RegExpExecArray | null;
  while ((match = rowRe.exec(html)) !== null) {
    const label = normalizeLabel(match[1]);
    const value = parseAmount(match[2]);
    if (label && value != null) table.set(label, value);
  }
  return table;
}

/**
 * Normalises a Persian label for stable matching: ASCII-fies digits, unifies the
 * Arabic vs Persian forms of kaf/yeh, and collapses whitespace. Applied to both
 * the scraped label and the registry symbol so they compare equal.
 */
export function normalizeLabel(input: string): string {
  return toAsciiDigits(input)
    .replace(/ك/g, 'ک') // Arabic kaf ك -> Persian kaf ک
    .replace(/[يى]/g, 'ی') // Arabic yeh ي / alef maqsura ى -> Persian yeh ی
    .replace(/\s+/g, ' ')
    .trim();
}

/** Strips currency signs / grouping commas and returns the integer Toman value. */
function parseAmount(raw: string): number | null {
  const digits = toAsciiDigits(raw).replace(/[^0-9]/g, '');
  if (!digits) return null;
  const value = Number(digits);
  return value > 0 ? value : null;
}

/** Converts Persian (۰-۹) and Arabic-Indic (٠-٩) digits to ASCII 0-9. */
function toAsciiDigits(input: string): string {
  return input.replace(/[۰-۹٠-٩]/g, (ch) => {
    const code = ch.charCodeAt(0);
    const base = code >= 0x06f0 ? 0x06f0 : 0x0660;
    return String(code - base);
  });
}
