'use client';
import { Scale } from 'lucide-react';
import { useGoldSilverRatio } from '@/hooks/useGoldPrice';
import { AssetBadge } from '@/components/ui/asset-badge';
import { formatPrice } from '@/lib/utils';

/** Gold/Silver ratio banner — how many ounces of silver equal one of gold. */
export function RatioWidget() {
  const { ratio, loading } = useGoldSilverRatio();

  if (loading || !ratio) {
    return <div className="skeleton h-[88px] rounded-2xl border border-border" />;
  }

  return (
    <div className="relative overflow-hidden bg-card border border-border rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-3 transition-colors hover:border-gold-500/30">
      <div className="absolute inset-0 bg-gradient-to-r from-gold-500/5 via-transparent to-slate-400/5 pointer-events-none" />
      <div className="relative flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 shrink-0 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center">
          <Scale className="w-5 h-5 text-gold-400" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Gold / Silver Ratio
          </p>
          <p className="hidden xs:block text-xs text-muted-foreground mt-0.5">
            Ounces of silver per ounce of gold
          </p>
        </div>
      </div>

      <div className="relative flex items-center gap-3 sm:gap-4 shrink-0">
        <div className="text-right">
          <p className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight tabular-nums leading-none">
            {ratio.ratio.toFixed(1)}
          </p>
          <div className="mt-1.5 flex items-center justify-end gap-2.5 text-xs text-muted-foreground tabular-nums">
            <span className="flex items-center gap-1">
              <AssetBadge asset="XAU" size="sm" />${formatPrice(ratio.gold)}
            </span>
            <span className="flex items-center gap-1">
              <AssetBadge asset="XAG" size="sm" />${formatPrice(ratio.silver)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
