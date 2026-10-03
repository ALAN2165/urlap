'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Trash2, Flag } from 'lucide-react';
import { api } from '@/lib/api';
import { AdminReport } from '@/types/admin';

export default function AdminReportsPage() {
  const queryClient = useQueryClient();
  const { data: reports, isLoading } = useQuery<AdminReport[]>({
    queryKey: ['admin-reports'],
    queryFn: async () => (await api.get('/admin/reports')).data,
  });

  async function remove(id: string) {
    if (!confirm('Dismiss and delete this report?')) return;
    try {
      await api.delete(`/admin/reports/${id}`);
      await queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      toast.success('Report dismissed.');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Could not delete the report.');
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h2 className="mb-5 text-sm font-bold text-slate-700 dark:text-slate-300">
        {reports?.length ?? 0} open report{reports?.length !== 1 ? 's' : ''}
      </h2>

      {isLoading && <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>}

      <div className="space-y-3">
        {reports?.map((r) => (
          <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-4 sm:p-5">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Flag size={14} className="text-amber-500" />
                <span className="text-sm font-bold text-slate-900 dark:text-white">{r.challengeTitle}</span>
              </div>
              <button onClick={() => remove(r.id)} className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-500">
                <Trash2 size={13} />
              </button>
            </div>
            <p className="mb-2 text-sm text-slate-600 dark:text-slate-300">{r.reason}</p>
            <div className="text-xs text-slate-400 dark:text-slate-500">
              Reported by {r.username} — {new Date(r.createdAt).toLocaleString()}
            </div>
          </motion.div>
        ))}
        {reports && reports.length === 0 && <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">No open reports — nice.</p>}
      </div>
    </div>
  );
}