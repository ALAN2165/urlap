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
    <motion.div whileHover={{ y: -3 }} className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
          <Icon size={18} className="text-purple-400" />
        </div>
        {hasDelta && TrendIcon && (
          <span className={`flex items-center gap-0.5 text-xs font-bold ${trendColor}`}>
            <TrendIcon size={13} />
            {Math.abs(deltaPct!)}%
          </span>
        )}
      </div>
      <div dir="ltr" className="text-2xl font-extrabold text-slate-900 dark:text-white">{loading ? '—' : value}</div>
      <div className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">{label}</div>
    </motion.div>
  );
}