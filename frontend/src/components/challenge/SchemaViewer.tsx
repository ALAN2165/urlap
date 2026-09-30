'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { KeyRound, Link2 } from 'lucide-react';
import { Schema } from '@/types';

export default function SchemaViewer({ schemaJson }: { schemaJson?: string | null }) {
  const t = useTranslations('challenge');
  if (!schemaJson) return null;
  let schema: Schema;
  try { schema = JSON.parse(schemaJson); } catch { return null; }

  return (
    <div className="mb-6">
      <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">{t('schema')}</h3>
      <div className="flex flex-wrap gap-4">
        {schema.tables.map((table, i) => (
          <motion.div key={table.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1, duration: 0.5 }}
            className="rounded-2xl overflow-hidden glass min-w-[240px]">
            <div className="px-4 py-3 bg-purple-500/10 border-b border-slate-200 dark:border-slate-700/50">
              <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">{table.name}</span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {table.columns.map((col) => (
                <div key={col.name} className="flex items-center justify-between px-4 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    {col.key === 'PK' && <KeyRound size={12} className="text-amber-500 dark:text-amber-400" />}
                    {col.key === 'FK' && <Link2 size={12} className="text-purple-500 dark:text-purple-400" />}
                    <span className="font-mono text-slate-700 dark:text-slate-300">{col.name}</span>
                  </div>
                  <span className="font-mono text-slate-400 dark:text-slate-500">{col.type}</span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}