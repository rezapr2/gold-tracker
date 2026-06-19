'use client';
import Link from 'next/link';
import { ArrowRight, LineChart, Radio } from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { MarketTicker } from '@/components/widgets/MarketTicker';
import { AssetPriceCard } from '@/components/widgets/AssetPriceCard';
import { RatioWidget } from '@/components/widgets/RatioWidget';
import { ASSETS, SHOW_GOLD_SILVER_RATIO } from '@/lib/assets';

/** Public, read-only homepage: live prices, ratio and charts. No auth required. */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <MarketTicker />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[42rem] h-[42rem] max-w-full rounded-full bg-gold-500/10 blur-3xl animate-glow-pulse pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gold-500/30 bg-gold-500/10 text-gold-400 text-xs font-medium mb-6 animate-fade-in-up">
            <Radio className="w-3.5 h-3.5" />
            Live market data · updated every few seconds
          </div>

          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight animate-fade-in-up"
            style={{ animationDelay: '60ms' }}
          >
            <span className="gradient-text-gold">Live market prices</span>
            <br className="hidden sm:block" />
            <span className="text-foreground"> in real time</span>
          </h1>

          <p
            className="mt-5 max-w-2xl mx-auto text-base sm:text-lg text-muted-foreground animate-fade-in-up"
            style={{ animationDelay: '120ms' }}
          >
            Real-time spot prices, ratios, historical charts and market stats —
            gold, silver and more assets, all live and no account needed.
          </p>

          <div
            className="mt-8 flex flex-wrap items-center justify-center gap-3 animate-fade-in-up"
            style={{ animationDelay: '180ms' }}
          >
            <a
              href="#prices"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gold-500 hover:bg-gold-600 text-gold-950 transition-colors"
            >
              <LineChart className="w-4 h-4" />
              View live prices
            </a>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-border hover:bg-secondary text-foreground transition-colors"
            >
              Admin dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <main id="prices" className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6 scroll-mt-20">
        {SHOW_GOLD_SILVER_RATIO && (
          <div className="animate-fade-in-up" style={{ animationDelay: '80ms' }}>
            <RatioWidget />
          </div>
        )}

        {/* Each tracked asset gets a live price tile that links to its full
            detail page (charts, stats and history). */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {ASSETS.map((asset, i) => (
            <div
              key={asset}
              className="animate-fade-in-up"
              style={{ animationDelay: `${160 + i * 80}ms` }}
            >
              <AssetPriceCard asset={asset} />
            </div>
          ))}
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
