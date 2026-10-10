'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { BookOpen, LayoutDashboard, Trophy, Megaphone, Terminal, Menu, X } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import LanguageToggle from './LanguageToggle';
import LogoOrb from '@/components/shared/LogoOrb';
import AvatarMenu from '@/components/shared/AvatarMenu';
import { useAuth } from '@/hooks/useAuth';

const LINKS = [
  { href: '/challenges', icon: BookOpen, key: 'challenges' },
  { href: '/dashboard', icon: LayoutDashboard, key: 'dashboard' },
  { href: '/leaderboard', icon: Trophy, key: 'leaderboard' },
  { href: '/announcements', icon: Megaphone, key: 'announcements' },
  { href: '/playground', icon: Terminal, key: 'playground' },
] as const;

export default function Navbar() {
  const t = useTranslations('nav');
  const { user } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

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
                  <span className="relative z-10">{t(link.key)}</span>
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
                className="flex h-10 w-10 items-center justify-center rounded-full glass lg:hidden"
              >
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
                return (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Link
                      href={link.href}
                      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-semibold transition-colors ${
                        active
                          ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300'
                          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <link.icon size={18} />
                      {t(link.key)}
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