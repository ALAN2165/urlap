'use client';

import { useEffect } from 'react';
import { useSocket } from './useSocket';
import { useAlertsStore } from '@/store/alertsStore';
import { AdminAlert } from '@/types/admin';

export function useAdminAlertsSocket() {
  const socket = useSocket();
  const addAlert = useAlertsStore((s) => s.addAlert);
  const updateAlertStatus = useAlertsStore((s) => s.updateAlertStatus);

  useEffect(() => {
    if (!socket) return;

    function handleNewAlert(payload: any) {
      const alert: AdminAlert = {
        id: payload.id,
        userId: payload.userId,
        username: payload.username,
        challengeId: payload.challengeId,
        challengeTitle: payload.challengeTitle,
        challengeSlug: '',
        conversationId: payload.conversationId,
        claimedBy: null,
        reason: `${payload.failCount} consecutive failed submissions`,
        failCount: payload.failCount,
        status: 'OPEN',
        createdAt: payload.createdAt,
      };
      addAlert(alert);
    }

    function handleAlertUpdated(payload: { id: string; status: AdminAlert['status'] }) {
      updateAlertStatus(payload.id, payload.status);
    }

    socket.on('alert:new', handleNewAlert);
    socket.on('alert:updated', handleAlertUpdated);

    return () => {
      socket.off('alert:new', handleNewAlert);
      socket.off('alert:updated', handleAlertUpdated);
    };
  }, [socket, addAlert, updateAlertStatus]);
}