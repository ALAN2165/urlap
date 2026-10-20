'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { LayoutDashboard, UserRound, Shield, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import AvatarCircle from './AvatarCircle';

export default function AvatarMenu() {
  const t = useTranslations('nav');
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((v) => !v)} className="relative block">
        <AvatarCircle name={user.username} avatarUrl={user.avatarUrl} size={38} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.15 }}
            className="glass absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-2xl p-2 rtl:left-0 rtl:right-auto"
          >
            <div className="mb-1 px-3 py-2">
              <div className="truncate text-sm font-bold text-slate-900 dark:text-white">
                {user.username}
              </div>
            </div>
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/50"
            >
              <LayoutDashboard size={15} /> {t('dashboard')}
            </Link>
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/50"
            >
              <UserRound size={15} /> {t('profile')}
            </Link>
            {user.role === 'ADMIN' && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-purple-600 hover:bg-purple-500/10 dark:text-purple-400"
              >
                <Shield size={15} /> Admin Dashboard
              </Link>
            )}
            <div className="my-1 border-t border-slate-200 dark:border-slate-700/50" />
            <button
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-start text-sm font-medium text-red-500 hover:bg-red-500/10"
            >
              <LogOut size={15} /> {t('logout')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}