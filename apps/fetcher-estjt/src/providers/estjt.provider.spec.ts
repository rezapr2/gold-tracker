import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { EstjtProvider, parsePriceTable, normalizeLabel } from './estjt.provider';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Trimmed real markup. Deliberately mixes digit/letter forms to exercise
// normalisation: the "18K" label uses Persian digits (۱۸) and the 24K value
// uses Persian digits, while the rest use ASCII — all must parse.
const FIXTURE = `
  <div class="price-table">
    <div>
      <span class="label">اُنس</span>
      <span class="amount green">
        $4,156      </span>
    </div>
    <div>
      <span class="label">سکه طرح جدید</span>
      <span class="amount green">
        164,000,000      </span>
    </div>
    <div>
      <span class="label">سکه طرح قدیم</span>
      <span class="amount red">
        158,500,000      </span>
    </div>
    <div>
      <span class="label">نیم سکه</span>
      <span class="amount red">
        84,400,000      </span>
    </div>
    <div>
      <span class="label">ربع سکه</span>
      <span class="amount red">
        48,400,000      </span>
    </div>
    <div>
      <span class="label">مظنه تهران</span>
      <span class="amount green">
        70,200,000      </span>
    </div>
    <div>
      <span class="label">طلا ۱۸ عیار</span>
      <span class="amount green">
        16,205,800      </span>
    </div>
    <div>
      <span class="label">طلا 24 عیار</span>
      <span class="amount green">
        ۲۱,۶۰۵,۰۰۰      </span>
    </div>
  </div>`;

describe('parsePriceTable', () => {
  it('extracts every row keyed by its normalised label', () => {
    const table = parsePriceTable(FIXTURE);

    expect(table.get('سکه طرح جدید')).toBe(164_000_000);
    expect(table.get('سکه طرح قدیم')).toBe(158_500_000);
    expect(table.get('نیم سکه')).toBe(84_400_000);
    expect(table.get('ربع سکه')).toBe(48_400_000);
    expect(table.get('مظنه تهران')).toBe(70_200_000);
  });

  it('normalises Persian digits in both label and value', () => {
    const table = parsePriceTable(FIXTURE);
    // Label digits ۱۸ -> 18; value parsed from ASCII grouping.
    expect(table.get('طلا 18 عیار')).toBe(16_205_800);
    // Value digits given in Persian (۲۱,۶۰۵,۰۰۰) -> 21605000.
    expect(table.get('طلا 24 عیار')).toBe(21_605_000);
  });

  it('strips the currency sign from the ounce row', () => {
    expect(parsePriceTable(FIXTURE).get('اُنس')).toBe(4156);
  });
});

describe('normalizeLabel', () => {
  it('unifies Arabic kaf/yeh, digits and whitespace', () => {
    // Arabic kaf (ك) + Arabic yeh (ي) + double spaces + Persian digit.
    expect(normalizeLabel('سكه  طرح  ۱')).toBe('سکه طرح 1');
  });
});

describe('EstjtProvider', () => {
  const config: Record<string, any> = { 'apis.estjt.url': 'https://www.estjt.ir/tv/' };
  let provider: EstjtProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new EstjtProvider({ get: (k: string) => config[k] } as ConfigService);
  });

  it('returns the Toman price for an IR_* asset', async () => {
    mockedAxios.get.mockResolvedValue({ data: FIXTURE });

    const result = await provider.fetchPrice('IR_COIN_EMAMI');

    expect(result?.price).toBe(164_000_000);
    expect(result?.currency).toBe('TOMAN');
    expect(result?.metal).toBe('IR_COIN_EMAMI');
    expect(result?.provider).toBe('estjt.ir');
  });

  it('matches the Persian-digit 18K label via the registry symbol', async () => {
    mockedAxios.get.mockResolvedValue({ data: FIXTURE });
    const result = await provider.fetchPrice('IR_GOLD_18K');
    expect(result?.price).toBe(16_205_800);
  });

  it('fetches the page once and serves every asset from the cache', async () => {
    mockedAxios.get.mockResolvedValue({ data: FIXTURE });

    const [emami, half, gold24] = await Promise.all([
      provider.fetchPrice('IR_COIN_EMAMI'),
      provider.fetchPrice('IR_COIN_HALF'),
      provider.fetchPrice('IR_GOLD_24K'),
    ]);

    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    expect(emami?.price).toBe(164_000_000);
    expect(half?.price).toBe(84_400_000);
    expect(gold24?.price).toBe(21_605_000);
  });

  it('does not support USD metals', () => {
    expect(provider.supports('XAU')).toBe(false);
    expect(provider.supports('IR_MAZANEH')).toBe(true);
  });

  it('returns null when the request fails', async () => {
    mockedAxios.get.mockRejectedValue(new Error('network'));
    expect(await provider.fetchPrice('IR_COIN_EMAMI')).toBeNull();
  });

  it('returns null when the row is absent from the table', async () => {
    mockedAxios.get.mockResolvedValue({ data: '<div class="price-table"></div>' });
    expect(await provider.fetchPrice('IR_COIN_EMAMI')).toBeNull();
  });
});
