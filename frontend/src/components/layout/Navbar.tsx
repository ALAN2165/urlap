'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { BookOpen, Mail, Trophy, Megaphone, Terminal, Menu, X } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import LanguageToggle from './LanguageToggle';
import LogoOrb from '@/components/shared/LogoOrb';
import AvatarMenu from '@/components/shared/AvatarMenu';
import { useAuth } from '@/hooks/useAuth';
import { useInboxUnread } from '@/hooks/useInboxUnread';
import { useAnnouncementsUnread } from '@/hooks/useAnnouncementsUnread';
import { useUserInboxSocket } from '@/hooks/useUserInboxSocket';

const LINKS = [
  { href: '/challenges', icon: BookOpen, key: 'challenges' },
  { href: '/inbox', icon: Mail, key: 'inbox' },
  { href: '/leaderboard', icon: Trophy, key: 'leaderboard' },
  { href: '/announcements', icon: Megaphone, key: 'announcements' },
  { href: '/playground', icon: Terminal, key: 'playground' },
] as const;

type LinkKey = (typeof LINKS)[number]['key'];

function UnreadDot({ count }: { count: number }) {
  return (
    <span className="absolute -right-4 -top-2.5 flex h-[18px] min-w-[18px] items-center justify-center rtl:-left-4 rtl:right-auto">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
      <span className="relative flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-[0_0_10px_rgba(239,68,68,0.9)]">
        {count > 9 ? '9+' : count}
      </span>
    </span>
  );
}

export default function Navbar() {
  const t = useTranslations('nav');
  const { user } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const inboxUnread = useInboxUnread();
  const announcementsUnread = useAnnouncementsUnread();
  const anyUnread = inboxUnread + announcementsUnread > 0;
  const unreadFor = (key: LinkKey) => (key === 'inbox' ? inboxUnread : key === 'announcements' ? announcementsUnread : 0);

  useUserInboxSocket(); // toast + refresh when Support Team writes (mounted once, here)

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const isActive = (href: string) => pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <motion.nav initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, ease: 'easeOut' }} className="fixed top-0 z-50 w-full glass">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 md:h-20 lg:px-8">
        <Link href="/" className="flex-shrink-0"><LogoOrb size={56} imgSize={34} float={false} /></Link>

        {user && (
          <div className="hidden items-center gap-1 lg:flex">
            {LINKS.map((link) => {
              const active = isActive(link.href);
              const count = unreadFor(link.key);
              return (
                <Link key={link.href} href={link.href}
                  className={`relative rounded-full px-4 py-2 text-[15px] font-semibold transition-colors ${active ? 'text-purple-700 dark:text-purple-300' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}>
                  {active && <motion.span layoutId="navbar-active-pill" className="absolute inset-0 rounded-full bg-purple-500/10 ring-1 ring-purple-500/25" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />}
                  <span className="relative z-10">
                    {t(link.key)}
                    {count > 0 && <UnreadDot count={count} />}
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
              <button onClick={() => setMobileOpen((v) => !v)} aria-label="Toggle navigation menu" className="relative flex h-10 w-10 items-center justify-center rounded-full glass lg:hidden">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={mobileOpen ? 'close' : 'open'} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }} className="flex">
                    {mobileOpen ? <X size={18} /> : <Menu size={18} />}
                  </motion.span>
                </AnimatePresence>
                {anyUnread && !mobileOpen && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-70" />
                    <span className="relative h-3.5 w-3.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)]" />
                  </span>
                )}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link href="/login"><motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.92 }} className="inline-block px-3 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">{t('login')}</motion.span></Link>
              <Link href="/register"><motion.span whileHover={{ scale: 1.06, y: -2 }} whileTap={{ scale: 0.94 }} className="inline-block rounded-full bg-gradient-to-r from-purple-600 to-purple-800 px-5 py-2.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(147,51,234,0.35)]">{t('register')}</motion.span></Link>
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
            className="overflow-hidden border-t border-slate-200 bg-white/95 shadow-2xl backdrop-blur-md dark:border-white/10 dark:bg-slate-900/95 lg:hidden"
          >
            <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3 sm:px-6">
              {LINKS.map((link, i) => {
                const active = isActive(link.href);
                const count = unreadFor(link.key);
                return (
                  <motion.div key={link.href} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                    <Link href={link.href} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-semibold transition-colors ${active ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5'}`}>
                      <link.icon size={18} />
                      <span className="flex-1">{t(link.key)}</span>
                      {count > 0 && <span className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white shadow-[0_0_8px_rgba(239,68,68,0.8)]">{count > 9 ? '9+' : count}</span>}
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