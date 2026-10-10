'use client';

import { motion } from 'framer-motion';

export interface RankedItem {
  label: string;
  detail?: string;
  value: number;
}

interface Props {
  items: RankedItem[];
  color: string;
  valueSuffix?: string;
  twoColumn?: boolean;
  emptyLabel?: string;
}

export default function RankedBarList({ items, color, valueSuffix = '', twoColumn = false, emptyLabel = 'No data yet.' }: Props) {
  if (items.length === 0) {
    return <div className="flex h-32 items-center justify-center text-sm text-slate-400 dark:text-slate-500">{emptyLabel}</div>;
  }

  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <ul className={twoColumn ? 'grid gap-x-12 gap-y-6 lg:grid-cols-2' : 'space-y-6'}>
      {items.map((item, i) => {
        const pct = Math.max((item.value / max) * 100, 4);
        return (
          <li key={`${item.label}-${i}`}>
            <div className="mb-2 flex items-baseline justify-between gap-4">
              <span className="min-w-0 break-words text-sm font-medium leading-snug text-slate-800 dark:text-slate-200">
                {item.label}
              </span>
              <span dir="ltr" className="flex-shrink-0 font-mono text-sm font-bold" style={{ color }}>
                {item.value}
                {valueSuffix}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800/70">
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${color}, ${color}99)` }}
                initial={{ width: 0 }}
                whileInView={{ width: `${pct}%` }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.8, delay: i * 0.06, ease: 'easeOut' }}
              />
            </div>
            {item.detail && <div className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">{item.detail}</div>}
          </li>
        );
      })}
    </ul>
  );
}