'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useExtra } from '@/i18n/extra';

/** A quiet "Crafted by" credit: a gradient initials avatar, and a soft glow that wakes up on hover. */
export default function CreatorBadge() {
  const x = useExtra();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      title={x('creatorRole')}
      className="group relative mx-auto w-fit"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-1 rounded-full bg-gradient-to-r from-purple-500/0 via-fuchsia-500/40 to-amber-400/0 opacity-0 blur-lg transition-opacity duration-500 group-hover:opacity-100"
      />
      <div className="relative flex items-center gap-3 rounded-full border border-slate-200 bg-white/80 py-2 pe-4 ps-2 backdrop-blur-md transition-colors duration-300 group-hover:border-purple-400/50 dark:border-white/10 dark:bg-slate-900/70">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 via-fuchsia-500 to-amber-400 text-[11px] font-black text-white shadow-[0_0_14px_rgba(168,85,247,0.45)]">
          {x('creatorInitials')}
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 rtl:normal-case rtl:tracking-normal dark:text-slate-500">{x('craftedBy')}</span>
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{x('creatorName')}</span>
        </span>
        <Sparkles size={14} className="text-purple-400 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-125" />
      </div>
    </motion.div>
  );
}