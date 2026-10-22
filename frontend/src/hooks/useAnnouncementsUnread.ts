'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useSocket } from './useSocket';
import { Announcement } from '@/types';

const seenKey = (userId: string) => `urlap:announcements-seen:${userId}`;

/** How many announcements were published since the student last opened the Announcements page. */
export function useAnnouncementsUnread(): number {
  const user = useAuthStore((s) => s.user);
  const pathname = usePathname();
  const socket = useSocket();
  const queryClient = useQueryClient();
  const [seenAt, setSeenAt] = useState<number | null>(null); // null until read from storage, so there's no false flash

  const { data } = useQuery<Announcement[]>({
    queryKey: ['announcements-unread'],
    queryFn: async () => (await api.get('/announcements')).data,
    enabled: !!user,
    refetchInterval: 30000,
    refetchOnWindowFocus: 'always',
  });

  useEffect(() => {
    if (!user) { setSeenAt(null); return; }
    let stored = 0;
    try { stored = Number(localStorage.getItem(seenKey(user.id)) || 0); } catch { /* storage unavailable */ }
    setSeenAt(stored);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Being on the Announcements page counts as reading everything published so far (including ones that arrive while open).
  useEffect(() => {
    if (!user || !data || !pathname?.startsWith('/announcements')) return;
    const newest = data.reduce((max, a) => Math.max(max, new Date(a.createdAt).getTime()), 0);
    const mark = Math.max(Date.now(), newest);
    try { localStorage.setItem(seenKey(user.id), String(mark)); } catch { /* ignore */ }
    setSeenAt(mark);
  }, [user, data, pathname]);

  // A newly published announcement lights the dot immediately.
  useEffect(() => {
    if (!socket) return;
    const refresh = () => { queryClient.invalidateQueries({ queryKey: ['announcements-unread'] }); };
    socket.on('announcement:new', refresh);
    return () => { socket.off('announcement:new', refresh); };
  }, [socket, queryClient]);

  if (!user || seenAt === null || !data) return 0;
  return data.filter((a) => new Date(a.createdAt).getTime() > seenAt).length;
}