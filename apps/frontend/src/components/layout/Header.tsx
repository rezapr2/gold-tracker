'use client';
import { useEffect, useState } from 'react';
import { Moon, Sun, Wifi, WifiOff } from 'lucide-react';
import { useTheme } from 'next-themes';
import { getSocket } from '@/lib/socket';
import { cn } from '@/lib/utils';

export function Header({ title }: { title: string }) {
  const { theme, setTheme } = useTheme();
  const [connected, setConnected] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const socket = getSocket();
    setConnected(socket.connected);
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    return () => {
      socket.off('connect');
      socket.off('disconnect');
    };
  }, []);

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>

      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border',
            connected
              ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
              : 'text-muted-foreground bg-muted border-border',
          )}
        >
          {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {connected ? 'Live' : 'Offline'}
        </div>

        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-border hover:bg-secondary transition-colors"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Moon className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        )}
      </div>
    </header>
  );
}
