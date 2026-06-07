import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number, decimals = 2): string {
  return price?.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercent(value: number, decimals = 2): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value?.toFixed(decimals)}%`;
}

export function formatChange(value: number, decimals = 2): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}$${Math.abs(value)?.toFixed(decimals)}`;
}

export function isPositive(value: number): boolean {
  return value >= 0;
}
