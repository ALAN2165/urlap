'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Database } from 'lucide-react';
import { api } from '@/lib/api';
import DataTable from '@/components/shared/DataTable';

interface TablePreview { name: string; columns: string[]; rows: unknown[][]; error: string | null; }

export default function LiveSampleDataViewer({ challengeSlug }: { challengeSlug: string }) {
  const { data, isLoading } = useQuery<{ tables: TablePreview[] }>({
    queryKey: ['challenge-sample-data', challengeSlug],
    queryFn: async () => (await api.get(`/challenges/${challengeSlug}/preview-data`)).data,
  });

  if (!isLoading && (!data || data.tables.length === 0)) return null;

  return (
    <div className="mb-6 space-y-4">
      {(isLoading ? [{ name: '', columns: [], rows: [], error: null }] : data!.tables).map((t, i) => (
        <motion.div key={t.name || i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
          <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <Database size={12} className="text-purple-400" />
            {t.name ? `Sample data — ${t.name}` : 'Sample data'}
          </div>
          <DataTable columns={t.columns} rows={t.rows} loading={isLoading} error={t.error} />
        </motion.div>
      ))}
    </div>
  );
}