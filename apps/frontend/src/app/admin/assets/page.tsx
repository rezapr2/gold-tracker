'use client';
import { useCallback, useEffect, useState } from 'react';
import { Coins, RefreshCw, Server } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { catalogApi } from '@/lib/api';
import { cn } from '@/lib/utils';

interface CatalogAsset {
  code: string;
  name: string;
  emoji: string;
  category: string;
  unit: string;
  quoteCurrency: string;
  fetcher?: string;
  enabled: boolean;
  disabledByFetcher: boolean;
}
interface CatalogFetcher {
  service: string;
  label: string;
  assetCount: number;
  enabled: boolean;
}
interface Catalog {
  assets: CatalogAsset[];
  fetchers: CatalogFetcher[];
}

/** Accessible on/off switch. */
function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
        checked ? 'bg-emerald-500' : 'bg-secondary',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  );
}

export default function AssetsPage() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res: any = await catalogApi.get();
      setCatalog(res.data ?? null);
      setError(null);
    } catch {
      setError('Could not load the asset catalog.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleFetcher = async (f: CatalogFetcher) => {
    setBusy(`fetcher:${f.service}`);
    try {
      await catalogApi.setFetcher(f.service, !f.enabled);
      await load();
    } catch {
      setError(`Failed to update ${f.label}.`);
    } finally {
      setBusy(null);
    }
  };

  const toggleAsset = async (a: CatalogAsset) => {
    setBusy(`asset:${a.code}`);
    try {
      await catalogApi.setAsset(a.code, !a.enabled);
      await load();
    } catch {
      setError(`Failed to update ${a.name}.`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="Assets & Fetchers" />
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Switch individual assets or whole fetchers on and off. Disabled assets stop
            being fetched and are hidden from the public site (applies within ~15s, no
            restart).
          </p>
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {loading && !catalog ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="skeleton h-48 rounded-2xl" />
            ))}
          </div>
        ) : !catalog ? (
          <p className="text-sm text-muted-foreground">No catalog data.</p>
        ) : (
          <div className="space-y-6">
            {catalog.fetchers.map((f) => {
              const assets = catalog.assets.filter((a) => a.fetcher === f.service);
              return (
                <div key={f.service} className="bg-card border border-border rounded-2xl overflow-hidden">
                  {/* Fetcher header + master toggle */}
                  <div className="flex items-center justify-between gap-3 p-4 sm:p-5 border-b border-border bg-secondary/30">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={cn(
                          'w-2 h-2 rounded-full shrink-0',
                          f.enabled ? 'bg-emerald-500' : 'bg-muted-foreground',
                        )}
                      />
                      <Server className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{f.label}</p>
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          {f.service} · {f.assetCount} assets
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {f.enabled ? 'On' : 'Paused'}
                      </span>
                      <Toggle
                        checked={f.enabled}
                        disabled={busy === `fetcher:${f.service}`}
                        onChange={() => toggleFetcher(f)}
                      />
                    </div>
                  </div>

                  {/* Asset rows */}
                  <ul className="divide-y divide-border">
                    {assets.map((a) => (
                      <li key={a.code} className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-lg shrink-0">{a.emoji}</span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{a.name}</p>
                            <p className="text-xs text-muted-foreground font-mono truncate">
                              {a.code} · {a.quoteCurrency}/{a.unit}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {a.disabledByFetcher && (
                            <span className="text-[11px] text-amber-500">fetcher paused</span>
                          )}
                          <Toggle
                            checked={a.enabled}
                            disabled={busy === `asset:${a.code}` || !f.enabled}
                            onChange={() => toggleAsset(a)}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}

            {/* Any asset not owned by a known fetcher (defensive). */}
            {catalog.assets.some((a) => !a.fetcher) && (
              <div className="bg-card border border-border rounded-2xl p-4 sm:p-5">
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                  <Coins className="w-4 h-4 text-muted-foreground" /> Other assets
                </p>
                <ul className="divide-y divide-border">
                  {catalog.assets
                    .filter((a) => !a.fetcher)
                    .map((a) => (
                      <li key={a.code} className="flex items-center justify-between gap-3 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-lg shrink-0">{a.emoji}</span>
                          <p className="text-sm font-medium text-foreground truncate">{a.name}</p>
                        </div>
                        <Toggle
                          checked={a.enabled}
                          disabled={busy === `asset:${a.code}`}
                          onChange={() => toggleAsset(a)}
                        />
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
