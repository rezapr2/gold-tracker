'use client';
import { useId } from 'react';

interface SparklineProps {
  /** Ordered price series, oldest → newest. */
  data: number[];
  /** Line + fill color (usually the asset's chart color). */
  color: string;
  className?: string;
  strokeWidth?: number;
}

/**
 * Tiny dependency-free trend line. Stretches to fill its container via
 * preserveAspectRatio="none"; the stroke stays crisp with non-scaling-stroke.
 * Renders nothing for empty/flat input so callers don't need to guard.
 */
export function Sparkline({ data, color, className, strokeWidth = 1.5 }: SparklineProps) {
  const gid = useId();
  const W = 100;
  const H = 32;
  const pad = 2;

  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = W / (data.length - 1);
  const usableH = H - pad * 2;

  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = pad + usableH - ((v - min) / range) * usableH;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p}`).join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`spark-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#spark-${gid})`} stroke="none" />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
