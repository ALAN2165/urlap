'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { SqlTestResult } from '@/types/admin';
import CodeEditor from '@/components/editor/CodeEditor';

interface Props {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}

export default function SqlTester({ value, onChange, label = 'Reference Answer (SQL)' }: Props) {
  const [result, setResult] = useState<SqlTestResult | null>(null);
  const [testing, setTesting] = useState(false);

  async function runTest() {
    setTesting(true);
    setResult(null);
    try {
      const { data } = await api.post<SqlTestResult>('/admin/sql-test', { sql: value });
      setResult(data);
    } catch (err: any) {
      setResult({ ok: false, columns: [], rows: [], message: err?.response?.data?.error || 'Test failed.', runtimeMs: 0 });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</label>
        <button type="button" onClick={runTest} disabled={testing || !value.trim()} className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-600 to-purple-800 px-4 py-1.5 text-xs font-bold text-white shadow-[0_0_14px_rgba(147,51,234,0.3)] disabled:opacity-50">
          {testing ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
          Test Query
        </button>
      </div>

      <CodeEditor value={value} onChange={onChange} language="SQL" />

      {result && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700/50">
          <div className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold ${result.ok ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
            {result.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
            {result.message}
            {result.ok && <span dir="ltr" className="ml-auto font-mono text-[10px] opacity-70">{result.runtimeMs}ms</span>}
          </div>
          {result.columns.length > 0 && (
            <div dir="ltr" className="scroll-thin max-h-56 overflow-auto">
              <table className="w-full border-collapse text-left font-mono text-xs">
                <thead><tr>{result.columns.map((c, i) => <th key={i} className="whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-purple-700 dark:border-slate-700/50 dark:bg-slate-800 dark:text-purple-300">{c}</th>)}</tr></thead>
                <tbody>
                  {result.rows.map((row, ri) => (
                    <tr key={ri} className="border-b border-slate-100 even:bg-slate-50/50 dark:border-slate-800/60 dark:even:bg-slate-800/20">
                      {row.map((cell, ci) => <td key={ci} className="whitespace-nowrap px-3 py-1.5 text-slate-700 dark:text-slate-300">{cell === null ? <span className="italic text-slate-400">NULL</span> : String(cell)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}