'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Header } from '@/components/layout/Header';
import { settingsApi } from '@/lib/api';
import { BotSettings } from '@/types';
import { cn } from '@/lib/utils';
import { Loader2, Save, Key, Bot, Bell, Clock, Database } from 'lucide-react';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const { register, handleSubmit, reset } = useForm<BotSettings>();

  useEffect(() => {
    settingsApi.get()
      .then((res: any) => {
        reset(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [reset]);

  const onSubmit = async (data: BotSettings) => {
    setSaving(true);
    setMessage(null);
    try {
      await settingsApi.update(data);
      setMessage({ text: 'Settings saved successfully!', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.response?.data?.message || 'Failed to save settings', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const inputClass = cn(
    'w-full px-3 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm',
    'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold-500/50 transition-all',
  );

  const labelClass = 'block text-xs font-medium text-muted-foreground mb-1.5';

  if (loading) {
    return (
      <div className="flex flex-col flex-1">
        <Header title="Settings" />
        <div className="p-6 flex items-center justify-center flex-1">
          <Loader2 className="w-6 h-6 animate-spin text-gold-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="Settings" />

      <div className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
          {message && (
            <div
              className={cn(
                'p-3 rounded-xl text-sm border',
                message.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-400',
              )}
            >
              {message.text}
            </div>
          )}

          {/* Telegram Section */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Bot className="w-4 h-4 text-blue-400" />
              <p className="text-sm font-semibold text-foreground">Telegram Configuration</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Bot Token</label>
                <input
                  {...register('telegramBotToken')}
                  type="password"
                  placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Channel ID</label>
                <input
                  {...register('telegramChannelId')}
                  placeholder="@your_channel_id or -100123456789"
                  className={inputClass}
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm text-foreground">Enable Telegram</p>
                  <p className="text-xs text-muted-foreground">Send automatic updates to Telegram</p>
                </div>
                <input type="checkbox" {...register('telegramEnabled')} className="w-4 h-4 accent-gold-500" />
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm text-foreground">Price Alerts</p>
                  <p className="text-xs text-muted-foreground">Alert on significant price movements</p>
                </div>
                <input type="checkbox" {...register('alertsEnabled')} className="w-4 h-4 accent-gold-500" />
              </div>
              <div>
                <label className={labelClass}>Alert Threshold (%)</label>
                <input
                  {...register('priceAlertThreshold', { valueAsNumber: true })}
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="10"
                  placeholder="1.5"
                  className={inputClass}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Send alert when price changes by this percentage
                </p>
              </div>
            </div>
          </div>

          {/* API Keys Section */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Key className="w-4 h-4 text-gold-400" />
              <p className="text-sm font-semibold text-foreground">Price API Keys</p>
            </div>
            <div className="space-y-4">
              {[
                { label: 'GoldAPI Key', field: 'goldApiKey' as keyof BotSettings, placeholder: 'goldapi.io API key' },
                { label: 'Metals.dev Key', field: 'metalsDevKey' as keyof BotSettings, placeholder: 'metals.dev API key' },
                { label: 'TwelveData Key', field: 'twelveDataKey' as keyof BotSettings, placeholder: 'twelvedata.com API key' },
                { label: 'AlphaVantage Key', field: 'alphaVantageKey' as keyof BotSettings, placeholder: 'alphavantage.co API key' },
              ].map(({ label, field, placeholder }) => (
                <div key={field}>
                  <label className={labelClass}>{label}</label>
                  <input
                    {...register(field)}
                    type="password"
                    placeholder={placeholder}
                    className={inputClass}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Scheduler Section */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-purple-400" />
              <p className="text-sm font-semibold text-foreground">Scheduler</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Price Fetch Interval (cron)</label>
                <input
                  {...register('priceFetchInterval')}
                  placeholder="*/1 * * * *"
                  className={inputClass}
                />
                <p className="text-xs text-muted-foreground mt-1">Default: every minute</p>
              </div>
            </div>
          </div>

          {/* Data section */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-4 h-4 text-cyan-400" />
              <p className="text-sm font-semibold text-foreground">Data Retention</p>
            </div>
            <div>
              <label className={labelClass}>Retention Days</label>
              <input
                {...register('dataRetentionDays', { valueAsNumber: true })}
                type="number"
                min="7"
                max="365"
                placeholder="90"
                className={inputClass}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Minute-level data older than this will be automatically deleted
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all',
              'bg-gold-500 hover:bg-gold-600 text-gold-950',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Settings
          </button>
        </form>
      </div>
    </div>
  );
}
