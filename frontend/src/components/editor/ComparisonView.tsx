'use client';

import { useExtra } from '@/i18n/extra';
import { ComparisonPanel, ComparisonSide } from '@/types';

const cellKey = (v: unknown) => (v === null || v === undefined ? '∅' : typeof v === 'number' ? String(Math.round(v * 1e9) / 1e9) : String(v));
const rowKey = (row: unknown[]) => row.map(cellKey).join('\u241F');

/** true for every row that has no counterpart in `other` (multiset diff). */
function unmatched(rows: unknown[][], other: unknown[][]): boolean[] {
  const pool = new Map<string, number>();
  other.forEach((r) => { const k = rowKey(r); pool.set(k, (pool.get(k) || 0) + 1); });
  return rows.map((r) => {
    const k = rowKey(r);
    const n = pool.get(k) || 0;
    if (n > 0) { pool.set(k, n - 1); return false; }
    return true;
  });
}

function SideTable({ label, side, tints, tone }: { label: string; side: ComparisonSide; tints: boolean[] | null; tone: 'bad' | 'missing' }) {
  const x = useExtra();
  const tintClass = tone === 'bad' ? 'bg-red-500/10' : 'bg-amber-500/10';
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <span>{label}</span>
        <span dir="ltr" className="font-mono normal-case">{side.total} row{side.total !== 1 ? 's' : ''}</span>
      </div>
      <div dir="ltr" className="scroll-thin max-w-full overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700/50">
        <table className="w-full border-collapse text-left font-mono text-xs">
          <thead>
            <tr>
              {side.columns.map((c, i) => (
                <th key={i} className="whitespace-nowrap border-b border-slate-200 bg-slate-100 px-3 py-2 font-semibold text-purple-700 dark:border-slate-700/50 dark:bg-slate-800 dark:text-purple-300">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {side.rows.length === 0 && (
              <tr><td colSpan={Math.max(side.columns.length, 1)} className="px-3 py-4 text-center text-slate-400 dark:text-slate-500">{x('noRows')}</td></tr>
            )}
            {side.rows.map((row, ri) => (
              <tr key={ri} className={`border-b border-slate-100 dark:border-slate-800/60 ${tints && tints[ri] ? tintClass : ''}`}>
                {row.map((cell, ci) => (
                  <td key={ci} className="whitespace-nowrap px-3 py-1.5 text-slate-700 dark:text-slate-200">
                    {cell === null || cell === undefined ? <span className="italic text-slate-400">NULL</span> : String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {side.total > side.rows.length && <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{x('rowsShown', { shown: side.rows.length, total: side.total })}</p>}
    </div>
  );
}

export default function ComparisonView({ panels }: { panels: ComparisonPanel[] }) {
  const x = useExtra();
  return (
    <div className="space-y-5">
      <p className="text-xs text-slate-500 dark:text-slate-400">{x('compareHint')}</p>
      {panels.map((p, i) => {
        // Only highlight when nothing was cut off by the row limit.
        const complete = p.actual.total <= p.actual.rows.length && p.expected.total <= p.expected.rows.length;
        return (
          <div key={i}>
            <div className="mb-2 text-sm font-bold text-slate-800 dark:text-slate-200">{p.title}</div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <SideTable label={x('yourOutput')} side={p.actual} tone="bad" tints={complete ? unmatched(p.actual.rows, p.expected.rows) : null} />
              <SideTable label={x('expectedOutput')} side={p.expected} tone="missing" tints={complete ? unmatched(p.expected.rows, p.actual.rows) : null} />
            </div>
          </div>
        );
      })}
    </div>
  );
}