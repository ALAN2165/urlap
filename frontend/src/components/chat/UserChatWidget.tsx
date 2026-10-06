'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useChatWidgetStore } from '@/store/chatWidgetStore';
import { useUserChatSocket } from '@/hooks/useUserChatSocket';
import { UserConversation } from '@/types';

export default function UserChatWidget() {
  const user = useAuthStore((s) => s.user);
  const { isOpen, conversationId, messages, close, toggle, setConversationId, setMessages, addMessage } = useChatWidgetStore();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useUserChatSocket();

  const { data: activeConversation } = useQuery<UserConversation | null>({
    queryKey: ['my-active-conversation'],
    queryFn: async () => (await api.get('/conversations/active')).data,
    enabled: !!user,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (activeConversation) {
      setConversationId(activeConversation.id);
      setMessages(activeConversation.messages);
    }
  }, [activeConversation, setConversationId, setMessages]);

  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  if (!user || !conversationId) return null;

  async function send() {
    if (!input.trim() || !conversationId) return;
    setSending(true);
    try {
      const { data } = await api.post(`/conversations/${conversationId}/messages`, { content: input });
      addMessage(data);
      setInput('');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="glass mb-4 flex h-[70vh] max-h-[480px] w-[90vw] max-w-sm flex-col overflow-hidden rounded-3xl shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700/50">
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">Need a hand?</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">An admin can see this conversation</div>
              </div>
              <button onClick={close} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {messages.length === 0 && (
                <p className="text-sm text-slate-400 dark:text-slate-500">We noticed you might be stuck — send a message and an admin will jump in.</p>
              )}
              {messages.map((m) => {
                const isMe = m.sender.id === user.id;
                return (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${isMe ? 'bg-gradient-to-r from-purple-600 to-purple-800 text-white' : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'}`}>
                      {m.content}
                    </div>
                  </motion.div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-slate-200 p-4 dark:border-slate-700/50">
              <div className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !sending) send(); }}
                  placeholder="Type a message…"
                  disabled={sending}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white disabled:opacity-50"
                />
                <button
                  onClick={send}
                  disabled={sending || !input.trim()}
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-purple-800 text-white disabled:opacity-40"
                >
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        onClick={toggle}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-purple-800 text-white shadow-[0_0_30px_rgba(147,51,234,0.5)]"
      >
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full bg-purple-500"
          animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <MessageCircle size={22} className="relative z-10" />
      </motion.button>
    </div>
  );
}