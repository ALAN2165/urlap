'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Terminal, CheckCircle2, XCircle, Clock, Loader2, ArrowRight, Sparkles } from 'lucide-react';
import { Submission } from '@/types';

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
      className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/[0.06] dark:bg-slate-950/70 dark:shadow-none">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-white/[0.06] dark:bg-white/[0.03]">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <Terminal size={14} className="text-teal-500" />
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
              <Loader2 size={16} className="animate-spin text-teal-500" />
              {t('running')}
            </div>
            {[0, 1, 2].map((i) => (
              <motion.div key={i} className="h-3 rounded bg-slate-200 dark:bg-white/[0.06]" style={{ width: `${90 - i * 18}%` }}
                animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }} />
            ))}
          </div>
        ) : submission ? (
          <div className="space-y-3">
            {status === 'ACCEPTED' && (
              <div className="flex items-center justify-between rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3">
                {submission.pointsAwarded > 0 ? (
                  <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                    className="flex items-center gap-2 text-sm font-bold text-green-700 dark:text-green-300">
                    <Sparkles size={16} />
                    {t('pointsEarned', { points: submission.pointsAwarded })}
                  </motion.span>
                ) : (
                  <span className="text-sm font-medium text-green-800 dark:text-green-300">{t('alreadySolved')}</span>
                )}
              </div>
            )}

            {status === 'WRONG_ANSWER' && reason && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-800 dark:text-red-300">{reason}</div>
            )}

            {submission.errorMessage && (
              <pre dir="ltr" className="whitespace-pre-wrap rounded-lg border border-red-200 bg-red-50 p-3 font-mono text-xs text-red-700 dark:border-red-500/20 dark:bg-red-950/40 dark:text-red-300">
                {submission.errorMessage}
              </pre>
            )}

            {columns.length > 0 && (
              <div dir="ltr" className="scroll-thin max-h-72 overflow-auto rounded-lg border border-slate-200 dark:border-white/[0.06]">
                <table className="w-full border-collapse text-left font-mono text-xs">
                  <thead>
                    <tr>
                      <th className="sticky top-0 z-10 w-10 border-b border-slate-200 bg-slate-100 px-3 py-2 text-right font-normal text-slate-400 dark:border-white/[0.06] dark:bg-slate-900">#</th>
                      {columns.map((col, i) => (
                        <th key={i} className="sticky top-0 z-10 whitespace-nowrap border-b border-slate-200 bg-slate-100 px-3 py-2 font-semibold text-teal-700 dark:border-white/[0.06] dark:bg-slate-900 dark:text-teal-300">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 && (
                      <tr><td colSpan={columns.length + 1} className="px-3 py-5 text-center text-slate-400 dark:text-slate-500">{t('noRows')}</td></tr>
                    )}
                    {rows.map((row, ri) => (
                      <motion.tr key={ri} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(ri, 14) * 0.03, duration: 0.25 }}
                        className="border-b border-slate-100 even:bg-slate-50/70 hover:bg-teal-500/5 dark:border-white/[0.04] dark:even:bg-white/[0.02]">
                        <td className="select-none px-3 py-1.5 text-right text-slate-400 dark:text-slate-500">{ri + 1}</td>
                        {row.map((cell, ci) => (
                          <td key={ci} className={`whitespace-nowrap px-3 py-1.5 ${typeof cell === 'number' ? 'text-right text-purple-700 dark:text-purple-300' : 'text-slate-800 dark:text-slate-200'}`}>
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
                <Link href={nextHref} className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-teal-500 to-purple-600 px-6 py-2.5 text-sm font-bold text-white shadow-[0_0_24px_rgba(20,184,166,0.35)] transition-transform hover:-translate-y-0.5">
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