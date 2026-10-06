'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, MailOpen, ChevronDown, ChevronUp, Shield } from 'lucide-react';
import { api } from '@/lib/api';
import { InboxMessage } from '@/types';
import { useUserInboxSocket } from '@/hooks/useUserInboxSocket';

export default function InboxPage() {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useUserInboxSocket();

  const { data: messages, isLoading } = useQuery<InboxMessage[]>({
    queryKey: ['inbox'],
    queryFn: async () => (await api.get('/inbox')).data,
  });

  async function openMessage(m: InboxMessage) {
    const next = expandedId === m.id ? null : m.id;
    setExpandedId(next);
    if (next && !m.read) {
      await api.put(`/inbox/${m.id}/read`);
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
      queryClient.invalidateQueries({ queryKey: ['inbox-unread'] });
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 md:py-12">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-8 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-500/10">
          <Mail size={20} className="text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Inbox</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Messages from the urlap team.</p>
        </div>
      </motion.div>

      {isLoading && <p className="text-sm text-slate-400">Loading…</p>}

      <div className="space-y-2">
        {messages?.map((m) => (
          <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass overflow-hidden rounded-2xl">
            <button onClick={() => openMessage(m)} className="flex w-full items-center gap-3 px-5 py-4 text-left">
              {m.read ? <MailOpen size={16} className="flex-shrink-0 text-slate-400" /> : <Mail size={16} className="flex-shrink-0 text-purple-500" />}
              <div className="min-w-0 flex-1">
                <div className={`truncate text-sm ${m.read ? 'font-medium text-slate-600 dark:text-slate-300' : 'font-bold text-slate-900 dark:text-white'}`}>{m.subject}</div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                  <Shield size={10} /> {m.senderLabel} · {new Date(m.createdAt).toLocaleDateString()}
                </div>
              </div>
              {expandedId === m.id ? <ChevronUp size={14} className="flex-shrink-0 text-slate-400" /> : <ChevronDown size={14} className="flex-shrink-0 text-slate-400" />}
            </button>
            <AnimatePresence>
              {expandedId === m.id && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-slate-200 px-5 py-4 dark:border-slate-700/50">
                  <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300">{m.body}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
        {messages && messages.length === 0 && <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">No messages yet.</p>}
      </div>
    </div>
  );
}