'use client';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { MarketTicker } from '@/components/widgets/MarketTicker';
import { MetalPanel } from '@/components/widgets/MetalPanel';
import { isAsset } from '@/lib/assets';

/** Public detail page for a single asset: full charts, stats and history. */
export default function AssetPage({ params }: { params: { id: string } }) {
  const id = params.id?.toUpperCase();
  if (!isAsset(id)) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <MarketTicker />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 scroll-mt-20">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          All prices
        </Link>

        <div className="animate-fade-in-up">
          <MetalPanel metal={id} />
        </div>
      </main>

      <footer className="border-t border-border mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground text-center sm:text-left">
          <p>Gold Tracker · Live market price tracking</p>
          <p>Prices are indicative and for informational purposes only.</p>
        </div>
      </footer>
    </div>
  );
}
