'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Lock } from 'lucide-react';
import { useLocale } from 'next-intl';
import { api } from '@/lib/api';
import { HintMeta, HintRevealed } from '@/types';

export default function HintPanel({ hints }: { hints: HintMeta[] }) {
  const locale = useLocale();
  const [revealed, setRevealed] = useState<Record<string, HintRevealed>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const sorted = [...hints].sort((a, b) => a.order - b.order);

  async function reveal(hintId: string) {
    setLoadingId(hintId);
    try {
      const { data } = await api.post(`/challenges/hints/${hintId}/reveal`);
      setRevealed((prev) => ({ ...prev, [hintId]: data }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="font-sans font-bold flex items-center gap-2 text-slate-900 dark:text-white">
        <Lightbulb size={18} className="text-teal-500 dark:text-teal-400" />
        Hints
      </h3>

      {sorted.map((hint, i) => {
        const prevRevealed = i === 0 || !!revealed[sorted[i - 1].id];
        const isRevealed = !!revealed[hint.id];

        return (
          <div key={hint.id} className="glass rounded-xl overflow-hidden">
            <button
              onClick={() => !isRevealed && prevRevealed && reveal(hint.id)}
              disabled={isRevealed || !prevRevealed || loadingId === hint.id}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700 dark:text-white/80 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all duration-300"
            >
              <span>Hint {hint.order} {!isRevealed && `(−${hint.pointPenalty} pts)`}</span>
              {!prevRevealed && !isRevealed ? <Lock size={14} /> : null}
              {loadingId === hint.id && <span className="text-xs">Loading…</span>}
            </button>
            <AnimatePresence>
              {isRevealed && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="px-4 pb-3 text-sm text-slate-600 dark:text-white/60">
                  {locale === 'ar' ? revealed[hint.id].contentAr : revealed[hint.id].contentEn}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}