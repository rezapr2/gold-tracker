'use client';
import { useEffect, useState } from 'react';
import { assetsApi } from '@/lib/api';
import { ASSETS, AssetId } from '@/lib/assets';

/**
 * The subset of the locally-known assets that the backend reports as enabled.
 * A disabled asset (or one whose fetcher is paused) is dropped so the public
 * site stops rendering it. Falls back to the full local list while loading or
 * if the API is unreachable, so the site never renders empty on a hiccup.
 */
export function useEnabledAssets(): AssetId[] {
  const [enabled, setEnabled] = useState<AssetId[]>(ASSETS);

  useEffect(() => {
    let cancelled = false;
    assetsApi
      .list()
      .then((res: any) => {
        if (cancelled) return;
        const codes = new Set<string>((res.data ?? []).map((a: { code: string }) => a.code));
        setEnabled(ASSETS.filter((a) => codes.has(a)));
      })
      .catch(() => {
        /* keep the full local list on failure */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return enabled;
}
