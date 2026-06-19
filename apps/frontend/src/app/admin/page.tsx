'use client';
import { Header } from '@/components/layout/Header';
import { AdminOverview } from '@/components/widgets/AdminOverview';
import { MetalPanel } from '@/components/widgets/MetalPanel';
import { RatioWidget } from '@/components/widgets/RatioWidget';
import { ASSETS, SHOW_GOLD_SILVER_RATIO } from '@/lib/assets';

export default function DashboardPage() {
  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="Dashboard" />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Control-panel overview: live KPIs + bot health. */}
        <AdminOverview />

        {SHOW_GOLD_SILVER_RATIO && <RatioWidget />}

        {/* Per-asset detail panels (stack on smaller screens). */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          {ASSETS.map((asset) => (
            <MetalPanel key={asset} metal={asset} />
          ))}
        </div>
      </div>
    </div>
  );
}
