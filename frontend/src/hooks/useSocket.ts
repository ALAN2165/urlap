'use client';

import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';
import { getSocket, disconnectSocket } from '@/lib/socket';

export function useSocket(): Socket | null {
  const user = useAuthStore((s) => s.user);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!user) {
      disconnectSocket();
      setSocket(null);
      return;
    }

    const token = localStorage.getItem('urlap_token');
    if (!token) return;

    setSocket(getSocket(token));

    // No disconnect in this cleanup on purpose: many components share one
    // underlying connection (sidebar badge, an open chat panel, global
    // listeners). Only logging out — the `!user` branch above — should
    // actually tear the connection down.
  }, [user]);

  return socket;
}