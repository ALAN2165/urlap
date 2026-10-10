'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { X, Send, Loader2, MessageSquarePlus } from 'lucide-react';
import { api } from '@/lib/api';

interface Props { userId: string; username: string; open: boolean; onClose: () => void; }

export default function AdminMessageUserModal({ userId, username, open, onClose }: Props) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  async function send() {
    if (!message.trim()) return;
    setSending(true);
    try {
      await api.post(`/admin/users/${userId}/message`, { message });
      toast.success(`Message sent to ${username} as "Support Team".`);
      setMessage('');
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Could not send the message.');
    } finally {
      setSending(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-extrabold text-slate-900 dark:text-white"><MessageSquarePlus size={18} className="text-purple-400" /> Message {username}</h3>
              <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
            </div>
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">Sent anonymously as "Support Team" — your admin username is never shown to the student.</p>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="Type your message…" className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white" />
            <button onClick={send} disabled={sending} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-purple-800 py-3 text-sm font-bold text-white shadow-[0_0_18px_rgba(147,51,234,0.3)] disabled:opacity-50">
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Send
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}