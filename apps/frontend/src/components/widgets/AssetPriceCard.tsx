'use client';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { PriceCard } from '@/components/widgets/PriceCard';
import { useLatestPrice } from '@/hooks/useGoldPrice';
import { AssetId } from '@/lib/assets';

/**
 * Home-page tile: a live price card for one asset that links to its detail
 * page (full charts and stats). The card itself is the click target, so we
 * intentionally don't pass `onRefresh` — there's no nested button to swallow
 * the navigation.
 */
export function AssetPriceCard({ asset }: { asset: AssetId }) {
  const { stats, loading } = useLatestPrice(asset);

  return (
    <Link
      href={`/asset/${asset}`}
      className="group block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/50"
    >
      <PriceCard stats={stats} loading={loading} metal={asset} />
      <p className="mt-2 flex items-center justify-end gap-1 text-xs font-medium text-muted-foreground transition-colors group-hover:text-gold-400">
        View charts &amp; details
        <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </p>
    </Link>
  );
}
