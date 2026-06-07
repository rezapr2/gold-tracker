'use client';
import { useEffect, useState } from 'react';
import { telegramApi } from '@/lib/api';
import { TelegramChannelConfig } from '@/types';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Save, X, Hash } from 'lucide-react';

const EMPTY: TelegramChannelConfig = {
  channelId: '',
  metal: 'XAU',
  name: '',
  template: '',
  language: 'en',
  enabled: true,
};

/** Manage multiple Telegram channels, each with its own message template. */
export function ChannelsManager() {
  const [channels, setChannels] = useState<TelegramChannelConfig[]>([]);
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [form, setForm] = useState<TelegramChannelConfig | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchChannels = async () => {
    const res: any = await telegramApi.listChannels();
    setChannels(res.data || []);
    setPlaceholders(res.placeholders || []);
  };

  useEffect(() => {
    fetchChannels().catch(console.error);
  }, []);

  const save = async () => {
    if (!form?.channelId) return;
    setSaving(true);
    try {
      await telegramApi.upsertChannel(form);
      setForm(null);
      await fetchChannels();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id?: string) => {
    if (!id) return;
    await telegramApi.deleteChannel(id);
    await fetchChannels();
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <p className="text-sm font-semibold text-foreground">Channels</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Broadcast to multiple channels — each with its own message pattern
          </p>
        </div>
        {!form && (
          <button
            onClick={() => setForm({ ...EMPTY })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gold-500/10 text-gold-400 border border-gold-500/20 hover:bg-gold-500/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Channel
          </button>
        )}
      </div>

      {/* Editor */}
      {form && (
        <div className="p-5 border-b border-border space-y-3 bg-secondary/20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              value={form.channelId}
              onChange={(e) => setForm({ ...form, channelId: e.target.value })}
              placeholder="@channel or -100123456789"
              className="px-3 py-2 rounded-lg bg-background border border-border text-sm"
            />
            <select
              value={form.metal}
              onChange={(e) => setForm({ ...form, metal: e.target.value as 'XAU' | 'XAG' })}
              className="px-3 py-2 rounded-lg bg-background border border-border text-sm"
            >
              <option value="XAU">🥇 Gold (XAU)</option>
              <option value="XAG">🥈 Silver (XAG)</option>
            </select>
            <input
              value={form.name ?? ''}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Label (optional)"
              className="px-3 py-2 rounded-lg bg-background border border-border text-sm"
            />
          </div>

          <textarea
            value={form.template ?? ''}
            onChange={(e) => setForm({ ...form, template: e.target.value })}
            placeholder="Optional message template. Leave empty for the default layout."
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Placeholders:{' '}
            {placeholders.map((p) => (
              <code key={p} className="mr-1 text-gold-400">{`{${p}}`}</code>
            ))}
          </p>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              />
              Enabled
            </label>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={form.sendCharts ?? false}
                onChange={(e) => setForm({ ...form, sendCharts: e.target.checked })}
              />
              Attach chart image
            </label>

            <div className="ml-auto flex gap-2">
              <button
                onClick={() => setForm(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-secondary transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving || !form.channelId}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 disabled:opacity-50 transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {channels.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground text-sm">
          No channels configured. The bot still posts to the channel set via environment variables.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {channels.map((c) => (
            <div key={c._id} className="flex items-center gap-3 px-5 py-3 hover:bg-secondary/30 transition-colors">
              <span className="text-base">{c.metal === 'XAG' ? '🥈' : '🥇'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Hash className="w-3 h-3 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground truncate">
                    {c.name || c.channelId}
                  </span>
                  {!c.enabled && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      disabled
                    </span>
                  )}
                  {c.template && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gold-500/10 text-gold-400">
                      custom template
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{c.channelId}</p>
              </div>
              <button
                onClick={() => setForm({ ...EMPTY, ...c })}
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-secondary transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => remove(c._id)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
