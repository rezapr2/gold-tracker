'use client';
import { Scale } from 'lucide-react';
import { useGoldSilverRatio } from '@/hooks/useGoldPrice';
import { formatPrice } from '@/lib/utils';

/** Gold/Silver ratio banner — how many ounces of silver equal one of gold. */
export function RatioWidget() {
  const { ratio, loading } = useGoldSilverRatio();

  if (loading || !ratio) {
    return <div className="h-[72px] bg-card border border-border rounded-2xl animate-pulse" />;
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gold-500/10 flex items-center justify-center">
          <Scale className="w-5 h-5 text-gold-400" />
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Gold / Silver Ratio
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ounces of silver per ounce of gold
          </p>
        </div>
      </div>

      <div className="text-right">
        <p className="text-3xl font-bold text-foreground tracking-tight">
          {ratio.ratio.toFixed(1)}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          🥇 ${formatPrice(ratio.gold)} · 🥈 ${formatPrice(ratio.silver)}
        </p>
      </div>
    </div>
  );
}
