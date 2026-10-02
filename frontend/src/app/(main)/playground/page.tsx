'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Play, Loader2, CheckCircle2, XCircle, Database as DatabaseIcon } from 'lucide-react';
import { api } from '@/lib/api';
import CodeEditor from '@/components/editor/CodeEditor';
import SchemaViewer from '@/components/challenge/SchemaViewer';

const EMPLOYEES_SCHEMA = JSON.stringify({
  tables: [
    {
      name: 'employees',
      columns: [
        { name: 'employee_id', type: 'int', key: 'PK' },
        { name: 'last_name', type: 'varchar' },
        { name: 'job_id', type: 'varchar' },
        { name: 'salary', type: 'int' },
        { name: 'hire_date', type: 'date' },
        { name: 'commission_pct', type: 'numeric' },
        { name: 'manager_id', type: 'int', key: 'FK' },
        { name: 'department_id', type: 'int', key: 'FK' },
      ],
    },
  ],
});

interface PlaygroundResult {
  ok: boolean;
  columns: string[];
  rows: unknown[][];
  message: string;
  runtimeMs: number;
}

export default function PlaygroundPage() {
  const t = useTranslations('playground');
  const [sql, setSql] = useState('SELECT * FROM employees LIMIT 10;\n');
  const [result, setResult] = useState<PlaygroundResult | null>(null);
  const [running, setRunning] = useState(false);

  async function run() {
    setRunning(true);
    setResult(null);
    try {
      const { data } = await api.post<PlaygroundResult>('/playground/run', { sql });
      setResult(data);
    } catch (err: any) {
      setResult({ ok: false, columns: [], rows: [], message: err?.response?.data?.error || 'Request failed.', runtimeMs: 0 });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-10">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-6 flex items-center gap-3 md:mb-8">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-500/10">
          <DatabaseIcon size={20} className="text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white sm:text-3xl">{t('title')}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">{t('subtitle')}</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <SchemaViewer schemaJson={EMPLOYEES_SCHEMA} />
        </div>

        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-end">
            <button
              onClick={run}
              disabled={running || !sql.trim()}
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-purple-800 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(147,51,234,0.3)] transition-all duration-300 hover:-translate-y-1 disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
              {running ? t('running') : t('run')}
            </button>
          </div>

          <CodeEditor value={sql} onChange={setSql} language="SQL" />

          {result && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700/50 dark:bg-slate-900/60">
              <div className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold ${result.ok ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                {result.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                <span className="whitespace-pre-line">{result.message}</span>
                {result.ok && <span dir="ltr" className="ml-auto flex-shrink-0 font-mono text-[10px] opacity-70">{result.runtimeMs}ms</span>}
              </div>
              {result.columns.length > 0 && (
                <div dir="ltr" className="scroll-thin max-h-96 overflow-auto">
                  <table className="w-full border-collapse text-left font-mono text-xs">
                    <thead>
                      <tr>
                        {result.columns.map((c, i) => (
                          <th key={i} className="sticky top-0 whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-purple-700 dark:border-slate-700/50 dark:bg-slate-800 dark:text-purple-300">{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.map((row, ri) => (
                        <tr key={ri} className="border-b border-slate-100 even:bg-slate-50/70 dark:border-slate-800/60 dark:even:bg-slate-800/20">
                          {row.map((cell, ci) => (
                            <td key={ci} className="whitespace-nowrap px-3 py-1.5 text-slate-700 dark:text-slate-300">
                              {cell === null ? <span className="italic text-slate-400">NULL</span> : String(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}