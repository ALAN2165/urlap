'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { AlertTriangle, MessageCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAlertsStore } from '@/store/alertsStore';
import { AdminAlert } from '@/types/admin';
import AdminChatPanel from '@/components/admin/alerts/AdminChatPanel';

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export default function AdminAlertsPage() {
  const queryClient = useQueryClient();
  const alerts = useAlertsStore((s) => s.alerts);
  const setAlerts = useAlertsStore((s) => s.setAlerts);
  const [selected, setSelected] = useState<string | null>(null);

  const { data: fetchedAlerts, isLoading } = useQuery<AdminAlert[]>({
    queryKey: ['admin-alerts'],
    queryFn: async () => (await api.get('/admin/alerts')).data,
  });

  useEffect(() => {
    if (fetchedAlerts) setAlerts(fetchedAlerts);
  }, [fetchedAlerts, setAlerts]);

  async function acknowledge(alert: AdminAlert) {
    try {
      await api.put(`/admin/alerts/${alert.id}/acknowledge`);
      if (alert.conversationId) setSelected(alert.conversationId);
      queryClient.invalidateQueries({ queryKey: ['admin-alerts'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Could not open this conversation.');
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
      <div>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
          <AlertTriangle size={15} className="text-red-400" />
          {alerts.length} active alert{alerts.length !== 1 ? 's' : ''}
        </h2>

        {isLoading && <p className="text-sm text-slate-400">Loading…</p>}

        <div className="space-y-2">
          {alerts.map((a) => (
            <motion.button
              key={a.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => acknowledge(a)}
              className={`glass flex w-full flex-col gap-1 rounded-2xl p-4 text-left transition-colors ${
                selected === a.conversationId ? 'ring-2 ring-purple-400' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900 dark:text-white">{a.username}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${a.status === 'OPEN' ? 'bg-red-500/15 text-red-600 dark:text-red-400' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'}`}>
                  {a.status === 'OPEN' ? 'NEW' : 'IN PROGRESS'}
                </span>
              </div>
              <div className="truncate text-xs text-slate-500 dark:text-slate-400">{a.challengeTitle}</div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
                <span>{a.failCount} failed attempts</span>
                <span>{timeAgo(a.createdAt)}</span>
              </div>
              {a.claimedBy && <div className="text-[11px] font-medium text-purple-500 dark:text-purple-400">Claimed by {a.claimedBy}</div>}
            </motion.button>
          ))}
          {!isLoading && alerts.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">No one's stuck right now. 🎉</p>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {selected ? (
          <AdminChatPanel
            key={selected}
            conversationId={selected}
            onClose={() => setSelected(null)}
            onResolved={() => { setSelected(null); queryClient.invalidateQueries({ queryKey: ['admin-alerts'] }); }}
          />
        ) : (
          <div className="glass flex h-[calc(100vh-13rem)] flex-col items-center justify-center rounded-3xl text-center">
            <MessageCircle size={32} className="mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-400 dark:text-slate-500">Select an alert to start chatting.</p>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}