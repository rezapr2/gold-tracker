'use client';
import { useEffect, useState } from 'react';
import { useForm, UseFormRegister } from 'react-hook-form';
import { Header } from '@/components/layout/Header';
import { settingsApi } from '@/lib/api';
import { BotSettings } from '@/types';
import { ASSETS, ASSET_META } from '@/lib/assets';
import { cn } from '@/lib/utils';
import { Loader2, Save, Key, Bot, Clock, Database, CheckCircle2, AlertCircle } from 'lucide-react';

const inputClass = cn(
  'w-full px-3 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm',
  'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold-500/50 transition-all',
);
const labelClass = 'block text-xs font-medium text-muted-foreground mb-1.5';

/** Card section with a tinted icon header. */
function Section({
  icon: Icon,
  tint,
  title,
  description,
  children,
}: {
  icon: typeof Bot;
  tint: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center border', tint)}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

/** A native checkbox styled as a sliding toggle (works with RHF register). */
function Toggle({
  register,
  name,
  title,
  description,
}: {
  register: UseFormRegister<BotSettings>;
  name: keyof BotSettings;
  title: string;
  description?: string;
}) {
  return (
    <label className="flex items-center justify-between py-2 cursor-pointer gap-4">
      <div>
        <p className="text-sm text-foreground">{title}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <span className="relative inline-flex shrink-0 items-center">
        <input type="checkbox" {...register(name)} className="sr-only peer" />
        <span className="w-11 h-6 rounded-full bg-muted transition-colors peer-checked:bg-gold-500 peer-focus-visible:ring-2 peer-focus-visible:ring-gold-500/60 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background" />
        <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

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

  if (loading) {
    return (
      <div className="flex flex-col flex-1">
        <Header title="Settings" />
        <div className="p-4 sm:p-6 max-w-2xl space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-40 rounded-2xl border border-border" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="Settings" />

      <div className="p-4 sm:p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl pb-20">
          {message && (
            <div
              className={cn(
                'flex items-center gap-2 p-3 rounded-xl text-sm border',
                message.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-400',
              )}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              {message.text}
            </div>
          )}

          <Section
            icon={Bot}
            tint="bg-blue-500/10 border-blue-500/20 text-blue-400"
            title="Telegram Configuration"
            description="Connect and control the publishing bot"
          >
            {ASSETS.map((asset) => {
              const meta = ASSET_META[asset];
              return (
                <div key={asset} className="rounded-xl border border-border bg-background/40 p-3 space-y-3">
                  <p className="text-sm font-medium text-foreground">
                    {meta.emoji} {meta.name} Bot
                  </p>
                  <div>
                    <label className={labelClass}>Bot Token</label>
                    <input
                      {...register(`telegramBots.${asset}.token` as const)}
                      type="password"
                      placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Channel ID</label>
                    <input
                      {...register(`telegramBots.${asset}.channelId` as const)}
                      placeholder="@your_channel_id or -100123456789"
                      className={inputClass}
                    />
                  </div>
                </div>
              );
            })}
            <Toggle
              register={register}
              name="telegramEnabled"
              title="Enable Telegram"
              description="Send automatic updates to Telegram"
            />
            <Toggle
              register={register}
              name="telegramSendCharts"
              title="Send Charts"
              description="Attach a trend chart image to updates"
            />
            <Toggle
              register={register}
              name="telegramCommandsEnabled"
              title="Interactive Commands"
              description="Answer /gold, /silver, /ratio — enable only with a single backend instance per bot token"
            />
            <Toggle
              register={register}
              name="alertsEnabled"
              title="Price Alerts"
              description="Alert on significant price movements"
            />
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
          </Section>

          <Section
            icon={Key}
            tint="bg-gold-500/10 border-gold-500/20 text-gold-400"
            title="Price API Keys"
            description="Providers used to fetch live prices"
          >
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
          </Section>

          <Section
            icon={Clock}
            tint="bg-purple-500/10 border-purple-500/20 text-purple-400"
            title="Scheduler"
            description="How often prices are fetched"
          >
            <div>
              <label className={labelClass}>Price Fetch Interval (cron)</label>
              <input
                {...register('priceFetchInterval')}
                placeholder="*/1 * * * *"
                className={inputClass}
              />
              <p className="text-xs text-muted-foreground mt-1">Default: every minute</p>
            </div>
          </Section>

          <Section
            icon={Database}
            tint="bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
            title="Data Retention"
            description="Automatic cleanup of old data"
          >
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
          </Section>
        </form>
      </div>

      {/* Sticky save bar */}
      <div className="sticky bottom-0 border-t border-border bg-card/80 backdrop-blur-sm px-4 sm:px-6 py-3">
        <div className="max-w-2xl flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground hidden sm:block">
            Changes apply after saving.
          </p>
          <button
            type="submit"
            onClick={handleSubmit(onSubmit)}
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
        </div>
      </div>
    </div>
  );
}
