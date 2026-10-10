'use client';

import { useEffect, useRef } from 'react';
import { useChatWidgetStore } from '@/store/chatWidgetStore';

/** Closes the active support conversation for this challenge the moment the
 *  user leaves it — either by SPA navigation (effect cleanup) or by closing
 *  the tab (`pagehide`, carried via fetch+keepalive since sendBeacon can't
 *  send an Authorization header). */
export function useChallengeChatLifecycle(challengeId: string | undefined) {
  const challengeIdRef = useRef(challengeId);
  challengeIdRef.current = challengeId;

  useEffect(() => {
    if (!challengeId) return;

    function closeAndClear() {
      const id = challengeIdRef.current;
      if (!id) return;

      const token = localStorage.getItem('urlap_token');
      if (token) {
        const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
        fetch(`${base}/conversations/close-for-challenge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ challengeId: id }),
          keepalive: true,
        }).catch(() => {});
      }

      const store = useChatWidgetStore.getState();
      if (store.conversationId) {
        store.setConversationId(null);
        store.setMessages([]);
        store.close();
      }
    }

    window.addEventListener('pagehide', closeAndClear);
    return () => {
      window.removeEventListener('pagehide', closeAndClear);
      closeAndClear();
    };
  }, [challengeId]);
}