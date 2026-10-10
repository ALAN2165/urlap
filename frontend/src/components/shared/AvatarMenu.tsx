'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Mail, UserRound, Shield, LogOut } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useUserInboxSocket } from '@/hooks/useUserInboxSocket';
import AvatarCircle from './AvatarCircle';

export default function AvatarMenu() {
  const t = useTranslations('nav');
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useUserInboxSocket();

  const { data: unread } = useQuery({
    queryKey: ['inbox-unread'],
    queryFn: async () => (await api.get('/inbox/unread-count')).data,
    enabled: !!user,
    refetchInterval: 30000,
  });
  const unreadCount = unread?.count ?? 0;

  useEffect(() => {
    function handleOutside(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((v) => !v)} className="relative block">
        <AvatarCircle name={user.username} avatarUrl={user.avatarUrl} size={38} />
        {unreadCount > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">{unreadCount}</span>}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, scale: 0.95, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -8 }} transition={{ duration: 0.15 }} className="glass absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-2xl p-2 rtl:left-0 rtl:right-auto">
            <div className="mb-1 px-3 py-2"><div className="truncate text-sm font-bold text-slate-900 dark:text-white">{user.username}</div></div>
            <Link href="/inbox" onClick={() => setOpen(false)} className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/50">
              <span className="flex items-center gap-2"><Mail size={15} /> {t('inbox')}</span>
              {unreadCount > 0 && <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{unreadCount}</span>}
            </Link>
            <Link href="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/50">
              <UserRound size={15} /> {t('profile')}
            </Link>
            {user.role === 'ADMIN' && (
              <Link href="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-purple-600 hover:bg-purple-500/10 dark:text-purple-400">
                <Shield size={15} /> Admin Dashboard
              </Link>
            )}
            <div className="my-1 border-t border-slate-200 dark:border-slate-700/50" />
            <button onClick={() => { setOpen(false); logout(); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-start text-sm font-medium text-red-500 hover:bg-red-500/10">
              <LogOut size={15} /> {t('logout')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}