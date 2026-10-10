'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from './useSocket';
import { ChatMessage } from '@/types';

export function useUserConversationsSocket() {
  const socket = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;
    function handleNewMessage(payload: ChatMessage) {
      queryClient.invalidateQueries({ queryKey: ['my-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['my-conversation', payload.conversationId] });
    }
    socket.on('message:new', handleNewMessage);
    return () => { socket.off('message:new', handleNewMessage); };
  }, [socket, queryClient]);
}