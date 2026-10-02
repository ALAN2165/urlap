'use client';

import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  deltaPct?: number | null;
  loading?: boolean;
}

export default function AdminStatCard({ icon: Icon, label, value, deltaPct, loading }: Props) {
  const hasDelta = deltaPct !== undefined && deltaPct !== null;
  const TrendIcon = !hasDelta ? null : deltaPct! > 0 ? ArrowUpRight : deltaPct! < 0 ? ArrowDownRight : Minus;
  const trendColor = !hasDelta ? '' : deltaPct! > 0 ? 'text-emerald-500' : deltaPct! < 0 ? 'text-red-500' : 'text-slate-400';

  return (
    <motion.div whileHover={{ y: -3 }} className="glass min-w-0 rounded-2xl p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between sm:mb-4">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-purple-500/10 sm:h-10 sm:w-10">
          <Icon size={17} className="text-purple-400" />
        </div>
        {hasDelta && TrendIcon && (
          <span className={`flex flex-shrink-0 items-center gap-0.5 text-xs font-bold ${trendColor}`}>
            <TrendIcon size={13} />
            {Math.abs(deltaPct!)}%
          </span>
        )}
      </div>
      <div dir="ltr" className="truncate text-lg font-extrabold text-slate-900 dark:text-white sm:text-2xl">
        {loading ? '—' : value}
      </div>
      <div className="mt-0.5 truncate text-[11px] font-medium text-slate-500 dark:text-slate-400 sm:text-xs">{label}</div>
    </motion.div>
  );
}