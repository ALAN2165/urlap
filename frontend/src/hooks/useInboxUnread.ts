'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

/** Number of unread Support Team messages (0 when signed out). Also refreshed live by the socket listener. */
export function useInboxUnread(): number {
  const user = useAuthStore((s) => s.user);
  const { data } = useQuery<{ count: number }>({
    queryKey: ['inbox-unread'],
    queryFn: async () => (await api.get('/inbox/unread-count')).data,
    enabled: !!user,
    refetchInterval: 20000,
    refetchOnWindowFocus: 'always',
  });
  return user ? data?.count ?? 0 : 0;
}