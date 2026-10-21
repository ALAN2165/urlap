'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useChatWidgetStore } from '@/store/chatWidgetStore';

export default function InboxReadSync() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isOpen = useChatWidgetStore((s) => s.isOpen);
  const conversationId = useChatWidgetStore((s) => s.conversationId);
  const messageCount = useChatWidgetStore((s) => s.messages.length);

  // Reading a Support Team message in the floating chat widget counts as reading it.
  useEffect(() => {
    if (!user || !isOpen || !conversationId) return;
    api.post(`/inbox/conversations/${conversationId}/read`)
      .then(() => queryClient.invalidateQueries({ queryKey: ['inbox-unread'] }))
      .catch(() => undefined);
  }, [user, isOpen, conversationId, messageCount, queryClient]);

  // Opening a thread in /inbox marks it read on the server; refresh the red dot right after it loads.
  useEffect(() => {
    return queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.action.type === 'success' && event.query.queryKey[0] === 'my-conversation') {
        queryClient.invalidateQueries({ queryKey: ['inbox-unread'] });
      }
    });
  }, [queryClient]);

  return null;
}