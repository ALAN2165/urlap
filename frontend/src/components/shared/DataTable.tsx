'use client';

interface Props {
  columns: string[];
  rows: unknown[][];
  loading?: boolean;
  error?: string | null;
  emptyLabel?: string;
}

export default function DataTable({ columns, rows, loading, error, emptyLabel = 'No rows.' }: Props) {
  if (loading) {
    return <div className="flex h-24 items-center justify-center text-sm text-slate-400 dark:text-slate-500">Loading sample data…</div>;
  }
  if (error) {
    return <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600 dark:border-red-500/20 dark:bg-red-950/30 dark:text-red-400">{error}</div>;
  }
  if (columns.length === 0) {
    return <div className="py-4 text-center text-sm text-slate-400 dark:text-slate-500">{emptyLabel}</div>;
  }

  return (
    // overflow-x-auto is the critical mobile fix: wide tables scroll inside
    // this box instead of blowing out the page's horizontal layout.
    <div dir="ltr" className="scroll-thin max-w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/50">
      <table className="w-full border-collapse text-left font-mono text-xs">
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={i} className="whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-purple-700 dark:border-slate-700/50 dark:bg-slate-800 dark:text-purple-300">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={columns.length} className="px-3 py-4 text-center text-slate-400 dark:text-slate-500">{emptyLabel}</td></tr>
          )}
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-slate-100 even:bg-slate-50/70 dark:border-slate-800/60 dark:even:bg-slate-800/20">
              {row.map((cell, ci) => (
                <td key={ci} className="whitespace-nowrap px-3 py-1.5 text-slate-700 dark:text-slate-300">
                  {cell === null || cell === undefined ? <span className="italic text-slate-400">NULL</span> : String(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}