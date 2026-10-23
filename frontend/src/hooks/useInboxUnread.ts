'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export interface InboxUnread { count: number; byConversation?: Record<string, number>; }

/** Number of unread Support Team messages (0 when signed out). */
export function useInboxUnread(): number {
  const userId = useAuthStore((s) => s.user?.id);

  const { data } = useQuery<InboxUnread>({
    queryKey: ['inbox-unread', userId ?? 'anon'], // per account, so one user's count never shows for another
    queryFn: async () => (await api.get('/inbox/unread-count', { params: { t: Date.now() } })).data,
    enabled: !!userId,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    refetchInterval: 15000,
    retry: 2,
  });

  return userId ? Number(data?.count) || 0 : 0;
}