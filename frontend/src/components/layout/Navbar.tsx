'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Menu, X, Shield } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import LanguageToggle from './LanguageToggle';
import LogoOrb from '@/components/shared/LogoOrb';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { useUserInboxSocket } from '@/hooks/useUserInboxSocket';
import { api } from '@/lib/api';

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;
  const [hovered, setHovered] = useState(false);

  return (
    <Link href={href} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} className="relative px-4 py-2.5">
      {(active || hovered) && (
        <motion.div layoutId="nav-pill" className="absolute inset-0 rounded-full bg-purple-500/10 border border-purple-400/20" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
      )}
      <motion.span whileTap={{ scale: 0.92 }} className={`relative z-10 text-[15px] font-semibold tracking-wide transition-colors ${active ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>
        {label}
      </motion.span>
    </Link>
  );
}

function MobileNavLink({ href, label, onClick }: { href: string; label: string; onClick: () => void }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`rounded-xl px-4 py-3 text-base font-semibold transition-colors ${
        active ? 'bg-purple-500/10 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
      }`}
    >
      {label}
    </Link>
  );
}

export default function Navbar() {
  const t = useTranslations('nav');
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdmin = user?.role === 'ADMIN';
useUserInboxSocket();
const { data: unread } = useQuery({
  queryKey: ['inbox-unread'],
  queryFn: async () => (await api.get('/inbox/unread-count')).data,
  enabled: !!user,
  refetchInterval: 30000,
});
const unreadCount = unread?.count ?? 0;
  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <motion.nav initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, ease: 'easeOut' }}
      className="fixed top-0 w-full z-50 glass">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 md:h-24 lg:px-8">
        <Link href="/">
          <LogoOrb size={72} imgSize={44} float={false} />
        </Link>

        <div className="hidden md:flex items-center gap-1">
          <NavLink href="/challenges" label={t('challenges')} />
          {user && <NavLink href="/dashboard" label={t('dashboard')} />}
          {user && <NavLink href="/leaderboard" label={t('leaderboard')} />}
          {user && <NavLink href="/announcements" label={t('announcements')} />}
          {user && <NavLink href="/playground" label={t('playground')} />}
          {user && <NavLink href="/profile" label={t('profile')} />}
          {user && (
  <Link href="/inbox" className="relative px-4 py-2.5">
    <span className="text-[15px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">Inbox</span>
    {unreadCount > 0 && (
      <span className="absolute -right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">{unreadCount}</span>
    )}
  </Link>
)}
          {isAdmin && (
            <Link href="/admin" className="ml-1">
              <motion.span
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                className="inline-flex items-center gap-1.5 rounded-full border border-purple-400/40 bg-purple-500/10 px-4 py-2 text-[13px] font-bold text-purple-600 dark:text-purple-400"
              >
                <Shield size={14} />
                Admin
              </motion.span>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
          <div className="hidden sm:block"><LanguageToggle /></div>
          <ThemeToggle />
          {user ? (
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={logout}
              className="hidden text-sm font-semibold px-5 py-2.5 rounded-full glass text-slate-700 dark:text-slate-300 sm:block">
              {t('logout')}
            </motion.button>
          ) : (
            <div className="hidden sm:flex items-center gap-3">
              <Link href="/login">
                <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.92 }} className="inline-block text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold text-[15px] px-4 py-2.5">
                  {t('login')}
                </motion.span>
              </Link>
              <Link href="/register">
                <motion.span whileHover={{ scale: 1.06, y: -2 }} whileTap={{ scale: 0.94 }} className="inline-block bg-gradient-to-r from-purple-600 to-purple-800 text-white font-bold text-[15px] shadow-[0_0_20px_rgba(147,51,234,0.35)] rounded-full px-7 py-3">
                  {t('register')}
                </motion.span>
              </Link>
            </div>
          )}

          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            className="flex h-10 w-10 items-center justify-center rounded-full glass md:hidden"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden border-t border-slate-200 dark:border-slate-700/50 md:hidden"
          >
            <div className="flex flex-col gap-1 p-4">
              <MobileNavLink href="/challenges" label={t('challenges')} onClick={() => setMenuOpen(false)} />
              {user && <MobileNavLink href="/dashboard" label={t('dashboard')} onClick={() => setMenuOpen(false)} />}
              {user && <MobileNavLink href="/leaderboard" label={t('leaderboard')} onClick={() => setMenuOpen(false)} />}
              {user && <MobileNavLink href="/announcements" label={t('announcements')} onClick={() => setMenuOpen(false)} />}
              {user && <MobileNavLink href="/playground" label={t('playground')} onClick={() => setMenuOpen(false)} />}
              {user && <MobileNavLink href="/profile" label={t('profile')} onClick={() => setMenuOpen(false)} />}

              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setMenuOpen(false)}
                  className="mt-1 flex items-center gap-3 rounded-xl border border-purple-400/30 bg-purple-500/10 px-4 py-3 text-base font-bold text-purple-600 dark:text-purple-400"
                >
                  <Shield size={17} />
                  Admin Dashboard
                </Link>
              )}

              <div className="my-2 border-t border-slate-200 dark:border-slate-700/50" />

              <div className="flex items-center justify-between px-4 py-1 sm:hidden">
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Language</span>
                <LanguageToggle />
              </div>

              {user ? (
                <button
                  onClick={() => { setMenuOpen(false); logout(); }}
                  className="mt-1 rounded-xl px-4 py-3 text-start text-base font-semibold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/50"
                >
                  {t('logout')}
                </button>
              ) : (
                <div className="flex flex-col gap-2 px-4 pt-2">
                  <Link href="/login" onClick={() => setMenuOpen(false)} className="rounded-xl py-2.5 text-center font-semibold text-slate-700 dark:text-slate-300">
                    {t('login')}
                  </Link>
                  <Link href="/register" onClick={() => setMenuOpen(false)} className="rounded-xl bg-gradient-to-r from-purple-600 to-purple-800 py-3 text-center font-bold text-white">
                    {t('register')}
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}