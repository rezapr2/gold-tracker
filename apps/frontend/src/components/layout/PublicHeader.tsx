'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LogIn, Moon, Sun, TrendingUp, Wifi, WifiOff } from 'lucide-react';
import { useTheme } from 'next-themes';
import { getSocket } from '@/lib/socket';
import { cn } from '@/lib/utils';

/** Top bar for the public, read-only homepage. */
export function PublicHeader() {
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
      <Link href="/" className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-gold-400" />
        </div>
        <div>
          <p className="font-bold text-foreground text-sm">Gold Tracker</p>
          <p className="text-xs text-muted-foreground">Live market prices</p>
        </div>
      </Link>

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
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Moon className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        )}

        <Link
          href="/admin"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-gold-500 hover:bg-gold-600 text-gold-950 transition-colors"
        >
          <LogIn className="w-4 h-4" />
          Admin
        </Link>
      </div>
    </header>
  );
}
