'use client';

import { motion } from 'framer-motion';
import { TrendPoint } from '@/types/admin';

export default function AdminTrendChart({ data }: { data: TrendPoint[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="glass h-full rounded-2xl p-5">
      <h3 className="mb-5 text-sm font-bold text-slate-900 dark:text-white">Submissions — last 7 days</h3>
      <div dir="ltr" className="flex h-32 items-end justify-between gap-2">
        {data.map((d, i) => {
          const pct = Math.round((d.count / max) * 100);
          const label = new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
          return (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-2">
              <div className="relative flex h-24 w-full items-end overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800/50" title={`${d.count} submissions`}>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${d.count > 0 ? Math.max(pct, 6) : 0}%` }}
                  transition={{ duration: 0.6, delay: i * 0.05, ease: 'easeOut' }}
                  className="w-full rounded-t-lg bg-gradient-to-t from-purple-600 to-purple-400"
                />
              </div>
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}