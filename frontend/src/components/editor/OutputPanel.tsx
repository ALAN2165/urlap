'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useLocale, useTranslations } from 'next-intl';
import { Terminal, CheckCircle2, XCircle, Clock, Loader2, ArrowRight, Sparkles } from 'lucide-react';
import { Submission } from '@/types';
import { getRandomSuccessMessage } from '@/lib/successMessages';

const ROW_CAP = 1000;

type Tone = 'ok' | 'bad' | 'warn';
const TONE_STYLES: Record<Tone, string> = {
  ok: 'text-green-700 dark:text-green-400 bg-green-500/10 border-green-500/30',
  bad: 'text-red-700 dark:text-red-400 bg-red-500/10 border-red-500/30',
  warn: 'text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/30',
};

function Cell({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span className="italic text-slate-400 dark:text-slate-500">NULL</span>;
  if (typeof value === 'object') return <>{JSON.stringify(value)}</>;
  return <>{String(value)}</>;
}

interface Props {
  submission: Submission | null;
  running: boolean;
  nextHref?: string;
}

export default function OutputPanel({ submission, running, nextHref }: Props) {
  const t = useTranslations('output');
  const locale = useLocale();

  // Picked once per submission (stable while this result is shown), fresh
  // on the next one — keyed on submission.id so it doesn't re-randomize
  // on unrelated re-renders.
  const successMessage = useMemo(() => getRandomSuccessMessage(locale), [submission?.id, locale]);

  if (!submission && !running) return null;

  const inFlight = running || submission?.status === 'PENDING' || submission?.status === 'RUNNING';
  const status = submission?.status ?? '';
  const meta: { tone: Tone; Icon: typeof CheckCircle2; label: string } =
    status === 'ACCEPTED' ? { tone: 'ok', Icon: CheckCircle2, label: t('statusAccepted') }
    : status === 'WRONG_ANSWER' ? { tone: 'bad', Icon: XCircle, label: t('statusWrong') }
    : status === 'TIME_LIMIT_EXCEEDED' ? { tone: 'warn', Icon: Clock, label: t('statusTimeout') }
    : { tone: 'bad', Icon: XCircle, label: t('statusError') };

  const columns = submission?.resultColumns ?? [];
  const rows = submission?.resultRows ?? [];
  const total = submission?.totalRows ?? rows.length;
  const totalDisplay = total >= ROW_CAP ? `${ROW_CAP}+` : String(total);

  const reason =
    submission?.failureReason === 'COLUMNS' ? t('reasonColumns')
    : submission?.failureReason === 'ROW_COUNT' ? t('reasonRowCount', { actual: total, expected: submission.expectedRowCount ?? 0 })
    : submission?.failureReason === 'ROWS' ? t('reasonRows')
    : submission?.failureReason === 'NOT_ROW_RETURNING' ? t('reasonNotRowReturning')
    : null;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: 'easeOut' }}
      className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700/50 dark:bg-slate-900/60 dark:shadow-none">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-700/50 dark:bg-slate-800/40">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <Terminal size={14} className="text-purple-400" />
          {t('title')}
        </div>
        {!inFlight && submission && (
          <div className="flex items-center gap-3 text-xs">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold ${TONE_STYLES[meta.tone]}`}>
              <meta.Icon size={13} />
              {meta.label}
            </span>
            {submission.runtimeMs != null && <span dir="ltr" className="font-mono text-slate-400 dark:text-slate-500">{submission.runtimeMs} ms</span>}
          </div>
        )}
      </div>

      <div className="p-4">
        {inFlight ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <Loader2 size={16} className="animate-spin text-purple-400" />
              {t('running')}
            </div>
          </div>
        ) : submission ? (
          <div className="space-y-3">
            {status === 'ACCEPTED' && (
              <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3">
                {submission.pointsAwarded > 0 ? (
                  <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }} className="flex flex-col gap-0.5">
                    <span className="flex items-center gap-2 text-sm font-bold text-green-700 dark:text-green-300">
                      <Sparkles size={16} />
                      {successMessage}
                    </span>
                    <span className="text-xs font-semibold text-green-600/80 dark:text-green-400/70">{t('pointsEarned', { points: submission.pointsAwarded })}</span>
                  </motion.div>
                ) : (
                  <span className="text-sm font-medium text-green-800 dark:text-green-300">{t('alreadySolved')}</span>
                )}
              </div>
            )}

            {status === 'WRONG_ANSWER' && reason && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-800 dark:text-red-300">{reason}</div>
            )}

            {submission.errorMessage && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-relaxed text-red-700 dark:border-red-500/20 dark:bg-red-950/40 dark:text-red-300">
                {submission.errorMessage}
              </div>
            )}

            {columns.length > 0 && (
              <div dir="ltr" className="scroll-thin max-h-72 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700/50">
                <table className="w-full border-collapse text-left font-mono text-xs">
                  <thead>
                    <tr>
                      <th className="sticky top-0 z-10 w-10 border-b border-slate-200 bg-slate-100 px-3 py-2 text-right font-normal text-slate-400 dark:border-slate-700/50 dark:bg-slate-800">#</th>
                      {columns.map((col, i) => (
                        <th key={i} className="sticky top-0 z-10 whitespace-nowrap border-b border-slate-200 bg-slate-100 px-3 py-2 font-semibold text-purple-700 dark:border-slate-700/50 dark:bg-slate-800 dark:text-purple-300">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 && (
                      <tr><td colSpan={columns.length + 1} className="px-3 py-5 text-center text-slate-400 dark:text-slate-500">{t('noRows')}</td></tr>
                    )}
                    {rows.map((row, ri) => (
                      <motion.tr key={ri} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(ri, 14) * 0.03, duration: 0.25 }}
                        className="border-b border-slate-100 even:bg-slate-50/70 hover:bg-purple-500/5 dark:border-slate-800/60 dark:even:bg-slate-800/20">
                        <td className="select-none px-3 py-1.5 text-right text-slate-400 dark:text-slate-500">{ri + 1}</td>
                        {row.map((cell, ci) => (
                          <td key={ci} className={`whitespace-nowrap px-3 py-1.5 ${typeof cell === 'number' ? 'text-right text-slate-700 dark:text-slate-300' : 'text-slate-800 dark:text-slate-200'}`}>
                            <Cell value={cell} />
                          </td>
                        ))}
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {columns.length > 0 && (
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>{t('rows')}: <span dir="ltr" className="font-mono font-semibold">{totalDisplay}</span></span>
                {total > rows.length && <span>{t('showingFirst', { shown: rows.length })}</span>}
              </div>
            )}

            {nextHref && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Link href={nextHref} className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-purple-800 px-6 py-2.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(147,51,234,0.3)] transition-transform hover:-translate-y-0.5">
                  {t('nextChallenge')}
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
                </Link>
              </motion.div>
            )}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}