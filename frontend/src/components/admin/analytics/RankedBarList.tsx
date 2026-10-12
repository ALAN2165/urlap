'use client';

import LiquidBar from './liquid/LiquidBar';

export interface RankedItem {
  label: string;
  detail?: string;
  value: number;
}

interface Props {
  items: RankedItem[];
  color: string; // 6-digit hex
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
    <ul className={twoColumn ? 'grid gap-x-12 gap-y-7 lg:grid-cols-2' : 'space-y-7'}>
      {items.map((item, i) => (
        <li key={`${item.label}-${i}`}>
          <div className="mb-2.5 flex items-baseline justify-between gap-4">
            <span className="min-w-0 break-words text-sm font-medium leading-snug text-slate-800 dark:text-slate-200">{item.label}</span>
            <span dir="ltr" className="flex-shrink-0 font-mono text-sm font-bold" style={{ color }}>
              {item.value}
              {valueSuffix}
            </span>
          </div>
          <LiquidBar pct={(item.value / max) * 100} color={color} delay={i * 0.08} />
          {item.detail && <div className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">{item.detail}</div>}
        </li>
      ))}
    </ul>
  );
}