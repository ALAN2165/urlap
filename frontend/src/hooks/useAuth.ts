// frontend/src/hooks/useAuth.ts
'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export function useAuth() {
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('urlap_token');
    if (!token) { setLoading(false); return; }
    api.get('/auth/me').then((res) => setUser(res.data)).catch(() => localStorage.removeItem('urlap_token')).finally(() => setLoading(false));
  }, [setUser]);

  async function login(email: string, password: string) {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('urlap_token', res.data.token);
    setUser(res.data.user);
    router.push('/dashboard');
  }

  // Intentionally does NOT auto-authenticate — the account is created,
  // then the person logs in explicitly on the login page.
  async function register(username: string, email: string, password: string) {
    await api.post('/auth/register', { username, email, password });
  }

  function logout() {
    localStorage.removeItem('urlap_token');
    setUser(null);
    router.push('/');
  }

  return { user, loading, login, register, logout };
}