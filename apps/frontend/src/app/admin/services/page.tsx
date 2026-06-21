'use client';
import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Server, RefreshCw } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { servicesApi } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Instance {
  instanceId: string;
  version: string;
  startedAt: string;
  lastSeen: string;
  healthy: boolean;
  detail?: Record<string, any>;
}
interface ServiceStatus {
  service: string;
  role: string;
  healthy: boolean;
  instances: Instance[];
}

/** Pretty-prints a heartbeat detail value for the summary line. */
function describeDetail(detail: Record<string, any> = {}): string[] {
  const out: string[] = [];
  if (detail.assets) out.push(`assets: ${(detail.assets as string[]).join(', ')}`);
  if (detail.breakerOpen?.length) out.push(`breaker open: ${detail.breakerOpen.join(', ')}`);
  if (typeof detail.totalSent === 'number') out.push(`sent: ${detail.totalSent} · failed: ${detail.totalFailed ?? 0}`);
  if (detail.lastFetch && typeof detail.lastFetch === 'object') {
    const times = Object.values(detail.lastFetch as Record<string, string>);
    if (times.length) out.push(`last fetch: ${formatDistanceToNow(new Date(times.sort().slice(-1)[0]), { addSuffix: true })}`);
  }
  return out;
}

function ServiceCard({ svc }: { svc: ServiceStatus }) {
  const replicas = svc.instances.length;
  const healthyCount = svc.instances.filter((i) => i.healthy).length;
  const newest = svc.instances.slice().sort((a, b) => b.lastSeen.localeCompare(a.lastSeen))[0];
  const detailLines = describeDetail(newest?.detail);

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Server className="w-4 h-4 text-muted-foreground" />
          {svc.service}
        </p>
        <span className="flex items-center gap-2 text-xs font-medium">
          <span
            className={cn('w-2 h-2 rounded-full', svc.healthy ? 'bg-emerald-500 animate-pulse' : 'bg-red-500')}
          />
          {svc.healthy ? 'Healthy' : 'Down'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-y-1 text-xs text-muted-foreground tabular-nums">
        <span>Replicas</span>
        <span className="text-right text-foreground">{healthyCount}/{replicas} up</span>
        <span>Version</span>
        <span className="text-right text-foreground">{newest?.version ?? '—'}</span>
        <span>Last seen</span>
        <span className="text-right text-foreground">
          {newest ? formatDistanceToNow(new Date(newest.lastSeen), { addSuffix: true }) : '—'}
        </span>
      </div>

      {detailLines.length > 0 && (
        <ul className="mt-3 pt-3 border-t border-border space-y-1 text-xs text-muted-foreground">
          {detailLines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const res: any = await servicesApi.list();
      setServices(res.data ?? []);
      setError(null);
    } catch {
      setError('Could not reach the API gateway.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 5000); // poll the live registry
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="Services" />
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Live status of every backend microservice (heartbeat registry, refreshes every 5s).
          </p>
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {loading && !services.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-40 rounded-2xl" />
            ))}
          </div>
        ) : services.length === 0 ? (
          <p className="text-sm text-muted-foreground">No services have reported in yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((svc) => (
              <ServiceCard key={svc.service} svc={svc} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
