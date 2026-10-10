'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Send, CheckCircle2, Loader2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { useAuthStore } from '@/store/authStore';
import { AdminConversation } from '@/types/admin';
import { ChatMessage } from '@/types';

const CANNED_RESPONSES = [
  "Check your JOIN conditions — make sure you're joining on the right columns.",
  'Review your GROUP BY logic — every non-aggregated column must be listed there.',
  'Double-check your WHERE clause for typos in column or table names.',
  'Make sure your aliases match exactly what the challenge expects (including case).',
  'Try a simple SELECT * first to confirm your table and column names are right.',
];

interface Props { conversationId: string; onClose: () => void; onResolved: () => void; }

export default function AdminChatPanel({ conversationId, onClose, onResolved }: Props) {
  const queryClient = useQueryClient();
  const socket = useSocket();
  const me = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [resolving, setResolving] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: conversation, isLoading } = useQuery<AdminConversation>({
    queryKey: ['admin-conversation', conversationId],
    queryFn: async () => (await api.get(`/admin/conversations/${conversationId}/messages`)).data,
  });

  useEffect(() => { if (conversation) setMessages(conversation.messages); }, [conversation]);

  useEffect(() => {
    if (!socket) return;
    function handleNew(payload: ChatMessage) {
      if (payload.conversationId !== conversationId) return;
      setMessages((prev) => (prev.some((m) => m.id === payload.id) ? prev : [...prev, payload]));
    }
    socket.on('message:new', handleNew);
    return () => { socket.off('message:new', handleNew); };
  }, [socket, conversationId]);

  useEffect(() => {
    if (!socket) return;
    function handleClosed(payload: { conversationId: string }) {
      if (payload.conversationId !== conversationId) return;
      queryClient.invalidateQueries({ queryKey: ['admin-conversation', conversationId] });
      toast.info('This conversation was closed (the user left the challenge page).');
    }
    socket.on('conversation:closed', handleClosed);
    return () => { socket.off('conversation:closed', handleClosed); };
  }, [socket, conversationId, queryClient]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function send(content: string) {
    if (!content.trim()) return;
    setSending(true);
    try {
      const { data } = await api.post(`/admin/conversations/${conversationId}/messages`, { content });
      setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));
      setInput('');
      queryClient.invalidateQueries({ queryKey: ['admin-alerts'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Could not send the message.');
    } finally {
      setSending(false);
    }
  }

  async function resolve() {
    setResolving(true);
    try {
      await api.put(`/admin/conversations/${conversationId}/close`);
      toast.success('Conversation closed and alert resolved.');
      onResolved();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Could not close the conversation.');
    } finally {
      setResolving(false);
    }
  }

  return (
    <div className="glass flex h-[calc(100vh-13rem)] flex-col overflow-hidden rounded-3xl">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700/50">
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-slate-900 dark:text-white">{conversation?.username ?? '…'}</div>
          <div className="truncate text-xs text-slate-500 dark:text-slate-400">{conversation?.challengeTitle ?? ''}</div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <button onClick={resolve} disabled={resolving || conversation?.status === 'CLOSED'} className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-600 disabled:opacity-40 dark:text-emerald-400">
            {resolving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Resolve
          </button>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {isLoading && <p className="text-sm text-slate-400">Loading…</p>}
        {messages.map((m) => {
          const isMe = m.sender.id === me?.id;
          return (
            <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${isMe ? 'bg-gradient-to-r from-purple-600 to-purple-800 text-white' : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'}`}>{m.content}</div>
            </motion.div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-slate-200 p-4 dark:border-slate-700/50">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {CANNED_RESPONSES.map((c) => (
            <button key={c} onClick={() => send(c)} disabled={sending} className="rounded-full border border-purple-400/30 bg-purple-500/5 px-3 py-1.5 text-[11px] font-medium text-purple-600 hover:bg-purple-500/10 disabled:opacity-40 dark:text-purple-400">
              {c.length > 40 ? `${c.slice(0, 40)}…` : c}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !sending) send(input); }} placeholder="Type a message…" disabled={sending || conversation?.status === 'CLOSED'} className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white disabled:opacity-50" />
          <button onClick={() => send(input)} disabled={sending || !input.trim() || conversation?.status === 'CLOSED'} className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-purple-800 text-white disabled:opacity-40">
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
          </button>
        </div>
      </div>
    </div>
  );
}