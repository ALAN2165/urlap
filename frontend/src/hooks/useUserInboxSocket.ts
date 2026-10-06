'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from './useSocket';

export function useUserInboxSocket() {
  const socket = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;
    function handleNew(payload: { id: string; subject: string }) {
      toast('New message from the urlap team', { description: payload.subject });
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
      queryClient.invalidateQueries({ queryKey: ['inbox-unread'] });
    }
    socket.on('inbox:new', handleNew);
    return () => { socket.off('inbox:new', handleNew); };
  }, [socket, queryClient]);
}