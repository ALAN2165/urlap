'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { BookOpen, Mail, Trophy, Megaphone, Terminal, Menu, X } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import LanguageToggle from './LanguageToggle';
import LogoOrb from '@/components/shared/LogoOrb';
import AvatarMenu from '@/components/shared/AvatarMenu';
import { useAuth } from '@/hooks/useAuth';
import { useUserInboxSocket } from '@/hooks/useUserInboxSocket';
import { api } from '@/lib/api';

const LINKS = [
  { href: '/challenges', icon: BookOpen, key: 'challenges' },
  { href: '/inbox', icon: Mail, key: 'inbox' },
  { href: '/leaderboard', icon: Trophy, key: 'leaderboard' },
  { href: '/announcements', icon: Megaphone, key: 'announcements' },
  { href: '/playground', icon: Terminal, key: 'playground' },
] as const;

export default function Navbar() {
  const t = useTranslations('nav');
  const { user } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useUserInboxSocket();

  const { data: unread } = useQuery({
    queryKey: ['inbox-unread'],
    queryFn: async () => (await api.get('/inbox/unread-count')).data,
    enabled: !!user,
    refetchInterval: 30000,
  });
  const unreadCount = unread?.count ?? 0;

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isActive = (href: string) => pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <motion.nav
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="fixed top-0 z-50 w-full glass"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 md:h-20 lg:px-8">
        <Link href="/" className="flex-shrink-0">
          <LogoOrb size={56} imgSize={34} float={false} />
        </Link>

        {user && (
          <div className="hidden items-center gap-1 lg:flex">
            {LINKS.map((link) => {
              const active = isActive(link.href);
              const showBadge = link.key === 'inbox' && unreadCount > 0;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative rounded-full px-4 py-2 text-[15px] font-semibold transition-colors ${
                    active
                      ? 'text-purple-700 dark:text-purple-300'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="navbar-active-pill"
                      className="absolute inset-0 rounded-full bg-purple-500/10 ring-1 ring-purple-500/25"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    {t(link.key)}
                    {showBadge && (
                      <span className="relative flex h-5 min-w-[20px] items-center justify-center">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-extrabold text-white shadow-[0_0_10px_rgba(239,68,68,0.8)]">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      </span>
                    )}
                  </span>
                </Link>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageToggle />
          <ThemeToggle />

          {user ? (
            <>
              <AvatarMenu />
              <button
                onClick={() => setMobileOpen((v) => !v)}
                aria-label="Toggle navigation menu"
                className="relative flex h-10 w-10 items-center justify-center rounded-full glass lg:hidden"
              >
                {unreadCount > 0 && !mobileOpen && (
                  <span className="absolute right-0.5 top-0.5 flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                  </span>
                )}
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={mobileOpen ? 'close' : 'open'}
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex"
                  >
                    {mobileOpen ? <X size={18} /> : <Menu size={18} />}
                  </motion.span>
                </AnimatePresence>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link href="/login">
                <motion.span
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.92 }}
                  className="inline-block px-3 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                >
                  {t('login')}
                </motion.span>
              </Link>
              <Link href="/register">
                <motion.span
                  whileHover={{ scale: 1.06, y: -2 }}
                  whileTap={{ scale: 0.94 }}
                  className="inline-block rounded-full bg-gradient-to-r from-purple-600 to-purple-800 px-5 py-2.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(147,51,234,0.35)]"
                >
                  {t('register')}
                </motion.span>
              </Link>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {user && mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden border-t border-slate-200/60 dark:border-slate-700/40 lg:hidden"
          >
            <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3 sm:px-6">
              {LINKS.map((link, i) => {
                const active = isActive(link.href);
                const showBadge = link.key === 'inbox' && unreadCount > 0;

                return (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Link
                      href={link.href}
                      className={`flex items-center justify-between rounded-xl px-4 py-3 text-[15px] font-semibold transition-colors ${
                        active
                          ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300'
                          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <link.icon size={18} />
                        {t(link.key)}
                      </span>
                      {showBadge && (
                        <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-extrabold text-white shadow-[0_0_10px_rgba(239,68,68,0.7)]">
                          {unreadCount}
                        </span>
                      )}
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}