'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Trash2, Flag, Send, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { AdminReport } from '@/types/admin';

export default function AdminReportsPage() {
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [sendingId, setSendingId] = useState<string | null>(null);

  const { data: reports, isLoading, refetch } = useQuery<AdminReport[]>({
    queryKey: ['admin-reports'],
    queryFn: async () => (await api.get('/admin/reports')).data,
  });

  async function remove(id: string) {
    if (!confirm('Dismiss and delete this report?')) return;
    try {
      await api.delete(`/admin/reports/${id}`);
      await refetch();
      toast.success('Report dismissed.');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Could not delete the report.');
    }
  }

  async function sendReply(id: string) {
    const message = replyDrafts[id]?.trim();
    if (!message) return;
    setSendingId(id);
    try {
      await api.post(`/admin/reports/${id}/reply`, { message });
      setReplyDrafts((prev) => ({ ...prev, [id]: '' }));
      toast.success("Reply sent to the student's inbox.");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Could not send the reply.');
    } finally {
      setSendingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h2 className="mb-5 text-sm font-bold text-slate-700 dark:text-slate-300">{reports?.length ?? 0} open report{reports?.length !== 1 ? 's' : ''}</h2>

      {isLoading && <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>}

      <div className="space-y-3">
        {reports?.map((r) => (
          <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-4 sm:p-5">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2"><Flag size={14} className="text-amber-500" /><span className="text-sm font-bold text-slate-900 dark:text-white">{r.challengeTitle}</span></div>
              <button onClick={() => remove(r.id)} className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-500"><Trash2 size={13} /></button>
            </div>
            <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">{r.reason}</p>
            <div className="mb-3 text-xs text-slate-400 dark:text-slate-500">Reported by {r.username} — {new Date(r.createdAt).toLocaleString()}</div>
            <div className="flex items-center gap-2">
              <input value={replyDrafts[r.id] ?? ''} onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter' && sendingId !== r.id) sendReply(r.id); }} placeholder="Reply as 'Support Team'…" className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white" />
              <button onClick={() => sendReply(r.id)} disabled={sendingId === r.id || !replyDrafts[r.id]?.trim()} className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-purple-800 text-white disabled:opacity-40">
                {sendingId === r.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={13} />}
              </button>
            </div>
          </motion.div>
        ))}
        {reports && reports.length === 0 && <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">No open reports — nice.</p>}
      </div>
    </div>
  );
}