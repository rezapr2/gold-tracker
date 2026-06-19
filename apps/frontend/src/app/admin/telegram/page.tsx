'use client';
import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { ChannelsManager } from '@/components/widgets/ChannelsManager';
import { telegramApi } from '@/lib/api';
import { TelegramStatus, PublishLog } from '@/types';
import { format } from 'date-fns';
import { cn, formatPrice, formatPercent } from '@/lib/utils';
import { Send, CheckCircle, XCircle, Clock, Bot, RefreshCw, BarChart3, History } from 'lucide-react';

export default function TelegramPage() {
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [logs, setLogs] = useState<PublishLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchData = async () => {
    try {
      const [statusRes, logsRes]: any[] = await Promise.all([
        telegramApi.getStatus(),
        telegramApi.getLogs(30),
      ]);
      setStatus(statusRes.data);
      setLogs(logsRes.data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSendUpdate = async () => {
    setSending(true);
    setMessage(null);
    try {
      await telegramApi.sendUpdate();
      setMessage({ text: 'Price update sent successfully!', type: 'success' });
      fetchData();
    } catch (err: any) {
      setMessage({ text: err.response?.data?.message || 'Failed to send update', type: 'error' });
    } finally {
      setSending(false);
    }
  };

  const handleSendSummary = async () => {
    setSending(true);
    setMessage(null);
    try {
      await telegramApi.sendSummary();
      setMessage({ text: 'Daily summary sent successfully!', type: 'success' });
      fetchData();
    } catch (err: any) {
      setMessage({ text: err.response?.data?.message || 'Failed to send summary', type: 'error' });
    } finally {
      setSending(false);
    }
  };

  const statusIcons: Record<string, React.ReactNode> = {
    success: <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />,
    failed: <XCircle className="w-3.5 h-3.5 text-red-500" />,
    pending: <Clock className="w-3.5 h-3.5 text-yellow-500" />,
  };

  const typeLabels: Record<string, string> = {
    scheduled: 'Scheduled',
    manual: 'Manual',
    alert: 'Alert',
    daily_summary: 'Daily Summary',
  };

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="Telegram Bot" />

      <div className="p-6 space-y-6">
        {/* Bot status */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-[104px] rounded-2xl border border-border" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-2xl p-5 transition-colors hover:border-gold-500/30">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-blue-400" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Bot Status</p>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'w-2 h-2 rounded-full',
                    status?.isEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-red-500',
                  )}
                />
                <span className="text-sm font-semibold text-foreground">
                  {status?.isEnabled ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 transition-colors hover:border-gold-500/30">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-purple-400" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Last Published</p>
              </div>
              <p className="text-sm font-semibold text-foreground tabular-nums">
                {status?.lastPublish
                  ? format(new Date(status.lastPublish), 'MMM dd, HH:mm')
                  : 'Never'}
              </p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 transition-colors hover:border-gold-500/30">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Total Sent</p>
              </div>
              <p className="text-2xl font-bold text-emerald-500 tabular-nums">
                {status?.totalSent?.toLocaleString() ?? '—'}
              </p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 transition-colors hover:border-gold-500/30">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <XCircle className="w-4 h-4 text-red-400" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Failed</p>
              </div>
              <p className="text-2xl font-bold text-red-500 tabular-nums">
                {status?.totalFailed?.toLocaleString() ?? '—'}
              </p>
            </div>
          </div>
        )}

        {/* Manual send actions */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-sm font-semibold text-foreground mb-4">Manual Actions</p>

          {message && (
            <div
              className={cn(
                'mb-4 p-3 rounded-xl text-sm border',
                message.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-400',
              )}
            >
              {message.text}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleSendUpdate}
              disabled={sending || !status?.isEnabled}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                'bg-gold-500/10 hover:bg-gold-500/20 text-gold-400 border border-gold-500/20',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {sending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Send Price Update
            </button>

            <button
              onClick={handleSendSummary}
              disabled={sending || !status?.isEnabled}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {sending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <BarChart3 className="w-4 h-4" />
              )}
              Send Daily Summary
            </button>
          </div>

          {!status?.isEnabled && (
            <p className="text-xs text-muted-foreground mt-3">
              Configure your Telegram bot token in Settings to enable sending.
            </p>
          )}
        </div>

        {/* Channels (multi-channel + per-channel templates) */}
        <ChannelsManager />

        {/* Publish logs */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <History className="w-4 h-4 text-muted-foreground" />
              Publish History
            </p>
            <button
              onClick={fetchData}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-12 rounded-xl" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No logs yet</div>
          ) : (
            <div className="divide-y divide-border">
              {logs.map((log) => (
                <div key={log._id} className="flex items-center gap-3 px-5 py-3 hover:bg-secondary/30 transition-colors">
                  {statusIcons[log.status]}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground">
                        {typeLabels[log.type]}
                      </span>
                      {log.goldPrice && (
                        <span className="text-xs text-muted-foreground">
                          ${formatPrice(log.goldPrice)}
                        </span>
                      )}
                      {log.changePercent !== undefined && (
                        <span
                          className={cn(
                            'text-xs',
                            log.changePercent >= 0 ? 'text-emerald-500' : 'text-red-500',
                          )}
                        >
                          {formatPercent(log.changePercent)}
                        </span>
                      )}
                    </div>
                    {log.errorMessage && (
                      <p className="text-xs text-red-400 mt-0.5 truncate">{log.errorMessage}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {format(new Date(log.createdAt), 'MMM dd, HH:mm')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
