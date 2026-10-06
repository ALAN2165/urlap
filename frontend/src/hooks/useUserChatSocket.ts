'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { useSocket } from './useSocket';
import { useChatWidgetStore } from '@/store/chatWidgetStore';
import { ChatMessage } from '@/types';

export function useUserChatSocket() {
  const socket = useSocket();
  const setConversationId = useChatWidgetStore((s) => s.setConversationId);
  const open = useChatWidgetStore((s) => s.open);
  const addMessage = useChatWidgetStore((s) => s.addMessage);

  useEffect(() => {
    if (!socket) return;

    function handleSupportAvailable(payload: { conversationId: string; challengeTitle: string }) {
      setConversationId(payload.conversationId);
      toast("Stuck? We're here to help.", {
        description: `About: ${payload.challengeTitle}`,
        action: { label: 'Open chat', onClick: () => open() },
        duration: 10000,
      });
    }

    function handleAdminJoined(payload: { conversationId: string }) {
      setConversationId(payload.conversationId);
      toast.success('An admin just joined your chat!', {
        action: { label: 'Open chat', onClick: () => open() },
        duration: 10000,
      });
    }

    function handleNewMessage(payload: ChatMessage) {
      addMessage(payload);
    }

    socket.on('support:available', handleSupportAvailable);
    socket.on('support:admin-joined', handleAdminJoined);
    socket.on('message:new', handleNewMessage);

    return () => {
      socket.off('support:available', handleSupportAvailable);
      socket.off('support:admin-joined', handleAdminJoined);
      socket.off('message:new', handleNewMessage);
    };
  }, [socket, setConversationId, open, addMessage]);
}