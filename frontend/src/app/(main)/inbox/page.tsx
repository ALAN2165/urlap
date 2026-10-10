'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Mail, ArrowLeft, Send, Loader2, Shield } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { ConversationSummary, UserConversation } from '@/types';
import { useUserConversationsSocket } from '@/hooks/useUserConversationsSocket';

export default function InboxPage() {
  const queryClient = useQueryClient();
  const me = useAuthStore((s) => s.user);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  useUserConversationsSocket();

  const { data: conversations, isLoading } = useQuery<ConversationSummary[]>({
    queryKey: ['my-conversations'],
    queryFn: async () => (await api.get('/conversations')).data,
  });

  const { data: thread, isLoading: threadLoading } = useQuery<UserConversation>({
    queryKey: ['my-conversation', selectedId],
    queryFn: async () => (await api.get(`/conversations/${selectedId}`)).data,
    enabled: !!selectedId,
  });

  async function sendReply() {
    if (!selectedId || !reply.trim()) return;
    setSending(true);
    try {
      await api.post(`/conversations/${selectedId}/messages`, { content: reply });
      setReply('');
      queryClient.invalidateQueries({ queryKey: ['my-conversation', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['my-conversations'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Could not send your reply.');
    } finally {
      setSending(false);
    }
  }

  if (selectedId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 md:py-12">
        <button onClick={() => setSelectedId(null)} className="mb-5 flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-purple-600 dark:text-slate-400 dark:hover:text-purple-400">
          <ArrowLeft size={15} className="rtl:rotate-180" /> Back to inbox
        </button>

        <div className="glass flex h-[65vh] flex-col overflow-hidden rounded-3xl">
          <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700/50">
            <div className="text-sm font-bold text-slate-900 dark:text-white">{thread?.challengeTitle ?? 'Support conversation'}</div>
            <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500"><Shield size={10} /> {thread?.status === 'CLOSED' ? 'Closed thread' : 'Open thread'}</div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {threadLoading && <p className="text-sm text-slate-400">Loading…</p>}
            {thread?.messages.map((m) => {
              const isMe = m.sender.id === me?.id;
              return (
                <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[80%]">
                    <div className={`rounded-2xl px-4 py-2.5 text-sm ${isMe ? 'bg-gradient-to-r from-purple-600 to-purple-800 text-white' : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'}`}>{m.content}</div>
                    {/* Never render m.sender.username — admin identity stays anonymous. */}
                    <div className={`mt-1 text-[10px] text-slate-400 dark:text-slate-500 ${isMe ? 'text-right' : 'text-left'}`}>{isMe ? 'You' : 'Support Team'}</div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="border-t border-slate-200 p-4 dark:border-slate-700/50">
            <div className="flex items-center gap-2">
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !sending) sendReply(); }}
                placeholder="Reply to Support Team…"
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white"
              />
              <button onClick={sendReply} disabled={sending || !reply.trim()} className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-purple-800 text-white disabled:opacity-40">
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 md:py-12">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-8 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-500/10"><Mail size={20} className="text-purple-400" /></div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Inbox</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Conversations with the urlap Support Team.</p>
        </div>
      </motion.div>

      {isLoading && <p className="text-sm text-slate-400">Loading…</p>}

      <div className="space-y-2">
        {conversations?.map((c) => (
          <motion.button key={c.id} onClick={() => setSelectedId(c.id)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass flex w-full items-center gap-3 rounded-2xl px-5 py-4 text-left">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-bold text-slate-900 dark:text-white">{c.challengeTitle ?? 'Support conversation'}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${c.status === 'OPEN' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-slate-500/15 text-slate-500 dark:text-slate-400'}`}>{c.status === 'OPEN' ? 'Open' : 'Closed'}</span>
              </div>
              {c.lastMessage && <p className="truncate text-xs text-slate-500 dark:text-slate-400">{c.lastMessage}</p>}
            </div>
            <span className="flex-shrink-0 text-[11px] text-slate-400 dark:text-slate-500">{new Date(c.lastMessageAt).toLocaleDateString()}</span>
          </motion.button>
        ))}
        {conversations && conversations.length === 0 && <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">No conversations yet.</p>}
      </div>
    </div>
  );
}