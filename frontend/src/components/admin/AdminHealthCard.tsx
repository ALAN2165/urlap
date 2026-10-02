'use client';

import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  label: string;
  ok?: boolean;
  detail?: string;
}

export default function AdminHealthCard({ icon: Icon, label, ok, detail }: Props) {
  const unknown = ok === undefined;

  return (
    <motion.div className="glass relative min-w-0 overflow-hidden rounded-2xl p-4 sm:p-5">
      {!unknown && !ok && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-red-500/5"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      <div className="relative z-10 mb-3 flex items-center justify-between">
        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${unknown ? 'bg-slate-200 dark:bg-slate-700/50' : ok ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
          <Icon size={17} className={unknown ? 'text-slate-400' : ok ? 'text-emerald-500' : 'text-red-500'} />
        </div>
        <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${unknown ? 'bg-slate-300 dark:bg-slate-600' : ok ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`} />
      </div>
      <div className="relative z-10 text-sm font-bold text-slate-900 dark:text-white">{label}</div>
      <div className="relative z-10 mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{detail ?? 'Checking…'}</div>
    </motion.div>
  );
}