'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';
import { Loader2, TrendingUp } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    try {
      setError(null);
      const res = await authApi.login(data.email, data.password) as any;
      setAuth(res.data.accessToken, res.data.user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Check your credentials.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-gold-900/20 via-background to-background" />

      <div className="relative w-full max-w-md px-6 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gold-500/10 border border-gold-500/20 mb-4">
            <TrendingUp className="w-8 h-8 text-gold-400" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Gold Tracker</h1>
          <p className="text-muted-foreground mt-1">Sign in to access the dashboard</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Email
              </label>
              <input
                {...register('email')}
                type="email"
                placeholder="admin@goldtracker.com"
                className={cn(
                  'w-full px-3 py-2.5 rounded-lg bg-background border text-foreground placeholder:text-muted-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-gold-500/50 transition-all',
                  errors.email ? 'border-destructive' : 'border-border',
                )}
              />
              {errors.email && (
                <p className="text-destructive text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Password
              </label>
              <input
                {...register('password')}
                type="password"
                placeholder="••••••••"
                className={cn(
                  'w-full px-3 py-2.5 rounded-lg bg-background border text-foreground placeholder:text-muted-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-gold-500/50 transition-all',
                  errors.password ? 'border-destructive' : 'border-border',
                )}
              />
              {errors.password && (
                <p className="text-destructive text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                'w-full py-2.5 px-4 rounded-lg font-semibold transition-all',
                'bg-gold-500 hover:bg-gold-600 text-gold-950',
                'focus:outline-none focus:ring-2 focus:ring-gold-500/50',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'flex items-center justify-center gap-2',
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
