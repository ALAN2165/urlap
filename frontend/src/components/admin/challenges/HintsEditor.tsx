'use client';

import { AdminHint } from '@/types/admin';

interface Props {
  hints: AdminHint[];
  onChange: (hints: AdminHint[]) => void;
}

export default function HintsEditor({ hints, onChange }: Props) {
  const update = (i: number, patch: Partial<AdminHint>) => onChange(hints.map((h, idx) => (idx === i ? { ...h, ...patch } : h)));

  return (
    <div className="space-y-4">
      {hints.map((hint, i) => (
        <div key={i} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700/50 dark:bg-slate-800/30">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-purple-500 dark:text-purple-400">Hint {i + 1}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400">Penalty</span>
              <input
                type="number"
                min={0}
                value={hint.pointPenalty}
                onChange={(e) => update(i, { pointPenalty: Number(e.target.value) })}
                className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-700/50 dark:bg-slate-900/50 dark:text-white"
              />
              <span className="text-xs text-slate-400">pts</span>
            </div>
          </div>
          <textarea
            value={hint.contentEn}
            onChange={(e) => update(i, { contentEn: e.target.value })}
            rows={2}
            placeholder="Hint text (English)"
            className="mb-2 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-700/50 dark:bg-slate-900/50 dark:text-white"
          />
          <textarea
            value={hint.contentAr}
            onChange={(e) => update(i, { contentAr: e.target.value })}
            rows={2}
            dir="rtl"
            placeholder="نص التلميح (عربي)"
            className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-700/50 dark:bg-slate-900/50 dark:text-white"
          />
        </div>
      ))}
    </div>
  );
}