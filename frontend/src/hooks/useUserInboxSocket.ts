'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from './useSocket';
import { useAuthStore } from '@/store/authStore';
import type { InboxUnread } from './useInboxUnread';
import { ChatMessage } from '@/types';

export function useUserInboxSocket() {
  const socket = useSocket();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    if (!socket || !userId) return;

    function handleNewMessage(payload: ChatMessage) {
      if (payload.sender.id === userId) return; // my own message is never "unread"
      toast('New message from Support Team');
      // Light the dot immediately, then let the server confirm the real number.
      queryClient.setQueryData<InboxUnread>(['inbox-unread', userId], (old) => ({ ...(old ?? { count: 0 }), count: (old?.count ?? 0) + 1 }));
      queryClient.invalidateQueries({ queryKey: ['inbox-unread'] });
    }

    socket.on('message:new', handleNewMessage);
    return () => { socket.off('message:new', handleNewMessage); };
  }, [socket, userId, queryClient]);
}