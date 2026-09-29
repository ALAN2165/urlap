'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Trophy, Megaphone } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import LanguageToggle from './LanguageToggle';
import LogoOrb from '@/components/shared/LogoOrb';
import AvatarCircle from '@/components/shared/AvatarCircle';
import { useAuth } from '@/hooks/useAuth';

function NavLink({ href, label, icon }: { href: string; label: string; icon?: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href;
  const [hovered, setHovered] = useState(false);

  return (
    <Link href={href} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} className="relative px-4 py-2.5">
      {(active || hovered) && (
        <motion.div layoutId="nav-pill" className="absolute inset-0 rounded-full bg-purple-500/10 border border-purple-400/20" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
      )}
      <motion.span whileTap={{ scale: 0.92 }} className={`relative z-10 flex items-center gap-1.5 text-[15px] font-semibold tracking-wide transition-colors ${active ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>
        {icon}
        {label}
      </motion.span>
    </Link>
  );
}

export default function Navbar() {
  const t = useTranslations('nav');
  const { user, logout } = useAuth();

  return (
    <motion.nav initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, ease: 'easeOut' }}
      className="fixed top-0 w-full z-50 h-24 flex items-center glass">
      <div className="max-w-7xl mx-auto px-8 w-full flex items-center justify-between">
        <Link href="/">
          <LogoOrb size={76} imgSize={46} />
        </Link>

        <div className="hidden md:flex items-center gap-1">
          <NavLink href="/challenges" label={t('challenges')} />
          {user && <NavLink href="/dashboard" label={t('dashboard')} />}
          {user && <NavLink href="/leaderboard" label={t('leaderboard')} icon={<Trophy size={15} className="text-purple-400" />} />}
          {user && <NavLink href="/announcements" label={t('announcements')} icon={<Megaphone size={15} className="text-purple-400" />} />}
        </div>

        <div className="flex items-center gap-4">
          <LanguageToggle />
          <ThemeToggle />
          {user ? (
            <>
              <Link href="/profile" title={t('profile')} aria-label={t('profile')}>
                <AvatarCircle name={user.username} size={38} />
              </Link>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={logout}
                className="text-sm font-semibold px-5 py-2.5 rounded-full glass text-slate-700 dark:text-slate-300">
                {t('logout')}
              </motion.button>
            </>
          ) : (
            <>
              <Link href="/login">
                <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.92 }} className="inline-block text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold text-[15px] px-4 py-2.5">
                  {t('login')}
                </motion.span>
              </Link>
              <Link href="/register">
                <motion.span whileHover={{ scale: 1.06, y: -2 }} whileTap={{ scale: 0.94 }} className="inline-block bg-gradient-to-r from-purple-500 to-purple-700 text-white font-bold text-[15px] shadow-[0_0_20px_rgba(168,85,247,0.35)] rounded-full px-7 py-3">
                  {t('register')}
                </motion.span>
              </Link>
            </>
          )}
        </div>
      </div>
    </motion.nav>
  );
}