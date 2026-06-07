'use client';
import { Header } from '@/components/layout/Header';
import { MetalPanel } from '@/components/widgets/MetalPanel';
import { RatioWidget } from '@/components/widgets/RatioWidget';
import { METALS } from '@/lib/metals';

export default function DashboardPage() {
  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="Live Dashboard" />

      <div className="p-6 space-y-6">
        <RatioWidget />

        {/* Gold and silver side by side (stacks on smaller screens). */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {METALS.map((metal) => (
            <MetalPanel key={metal} metal={metal} />
          ))}
        </div>
      </div>
    </div>
  );
}
