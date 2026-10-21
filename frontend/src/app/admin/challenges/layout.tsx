'use client';

import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ArrowUpDown, Crown } from 'lucide-react';
import LabReorderPanel from '@/components/admin/challenges/LabReorderPanel';

export default function AdminChallengesLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="mx-auto mb-5 flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Crown size={13} className="flex-shrink-0 text-amber-400" />
          To make a challenge a hidden Master Challenge, open it and switch on “Mystery / Master Challenge”.
        </p>
        <button onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:border-purple-400 hover:text-purple-600 dark:border-slate-700/50 dark:text-slate-300">
          <ArrowUpDown size={13} />
          Reorder labs
        </button>
      </div>
      {children}
      <AnimatePresence>{open && <LabReorderPanel onClose={() => setOpen(false)} />}</AnimatePresence>
    </>
  );
}