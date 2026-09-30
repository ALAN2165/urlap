'use client';

import { useId } from 'react';
import { motion } from 'framer-motion';

interface Props {
  value: number;
  size?: number;
  stroke?: number;
  dim?: boolean;
  children?: React.ReactNode;
}

export default function ProgressRing({ value, size = 120, stroke = 10, dim = false, children }: Props) {
  const gradientId = useId().replace(/:/g, '');
  const radius = (size - stroke) / 2;
  const center = size / 2;
  const clamped = Math.max(0, Math.min(1, value));

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#7e22ce" />
          </linearGradient>
        </defs>
        <circle cx={center} cy={center} r={radius} fill="none" strokeWidth={stroke} className="stroke-slate-200 dark:stroke-slate-700/50" />
        {clamped > 0 && (
          <motion.circle
            cx={center} cy={center} r={radius} fill="none"
            stroke={`url(#${gradientId})`} strokeWidth={stroke} strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: clamped }} transition={{ duration: 1.4, ease: 'easeOut' }}
            style={{ filter: dim ? undefined : 'drop-shadow(0 0 6px rgba(147,51,234,0.4))' }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}