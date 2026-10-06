import { create } from 'zustand';
import { ChatMessage } from '@/types';

interface ChatWidgetState {
  isOpen: boolean;
  conversationId: string | null;
  messages: ChatMessage[];
  open: () => void;
  close: () => void;
  toggle: () => void;
  setConversationId: (id: string | null) => void;
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
}

export const useChatWidgetStore = create<ChatWidgetState>((set) => ({
  isOpen: false,
  conversationId: null,
  messages: [],
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  setConversationId: (conversationId) => set({ conversationId }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((s) => (s.messages.some((m) => m.id === message.id) ? s : { messages: [...s.messages, message] })),
}));