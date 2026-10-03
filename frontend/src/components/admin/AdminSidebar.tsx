'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { LayoutDashboard, BookOpen, Users, Megaphone, ArrowLeft, Menu,Flag, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import LogoOrb from '@/components/shared/LogoOrb';

const SECTIONS = [
  {
    label: 'Overview',
    links: [{ href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true }],
  },
  {
    label: 'Manage',
    links: [
      { href: '/admin/reports', label: 'Reports', icon: Flag, exact: false },
      { href: '/admin/challenges', label: 'Challenges', icon: BookOpen, exact: false },
      { href: '/admin/users', label: 'Users', icon: Users, exact: false },
      { href: '/admin/announcements', label: 'Announcements', icon: Megaphone, exact: false },
    ],
  },
];

function SidebarLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-5">
      {SECTIONS.map((section) => (
        <div key={section.label}>
          <div className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{section.label}</div>
          <div className="flex flex-col gap-1">
            {section.links.map((link) => {
              const active = link.exact ? pathname === link.href : pathname?.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onNavigate}
                  className={`group relative flex items-center gap-3 overflow-hidden rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                    active
                      ? 'text-slate-900 dark:text-white'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {active && (
                    <>
                      <motion.div layoutId="admin-nav-bg" className="absolute inset-0 rounded-xl bg-purple-500/10" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                      <motion.div layoutId="admin-nav-accent" className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-gradient-to-b from-purple-400 to-purple-600" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                    </>
                  )}
                  <span className={`relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${active ? 'bg-purple-500/15 text-purple-500 dark:text-purple-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800/60 group-hover:text-purple-400'}`}>
                    <link.icon size={15} />
                  </span>
                  <span className="relative z-10">{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export default function AdminSidebar() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col glass lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-6">
          <LogoOrb size={40} imgSize={24} float={false} />
          <div>
            <div className="text-sm font-extrabold text-slate-900 dark:text-white">urlap</div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-purple-500 dark:text-purple-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-purple-500" />
              </span>
              Admin Console
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2">
          <SidebarLinks />
        </div>

        <div className="border-t border-slate-200 p-4 dark:border-slate-700/50">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-100/70 p-3 dark:bg-slate-800/40">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-700 text-sm font-bold text-white">
              {user?.username?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user?.username}</div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-purple-500 dark:text-purple-400">Administrator</div>
            </div>
          </div>
          <Link href="/" className="mb-1 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/50">
            <ArrowLeft size={16} />
            Back to site
          </Link>
          <button onClick={logout} className="w-full rounded-xl px-4 py-2.5 text-start text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/50">
            Logout
          </button>
        </div>
      </aside>

      <div className="sticky top-0 z-40 flex items-center justify-between glass px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <LogoOrb size={34} imgSize={20} float={false} />
          <span className="text-sm font-extrabold text-slate-900 dark:text-white">Admin</span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-full glass">
          <Menu size={18} />
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-black/40 lg:hidden" />
            <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', stiffness: 350, damping: 35 }}
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white dark:bg-slate-900 lg:hidden">
              <div className="flex items-center justify-between px-5 py-6">
                <div className="flex items-center gap-2">
                  <LogoOrb size={36} imgSize={22} float={false} />
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white">Admin</span>
                </div>
                <button onClick={() => setMobileOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full glass">
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-4"><SidebarLinks onNavigate={() => setMobileOpen(false)} /></div>
              <div className="border-t border-slate-200 p-4 dark:border-slate-700/50">
                <Link href="/" onClick={() => setMobileOpen(false)} className="mb-2 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/50">
                  <ArrowLeft size={16} />
                  Back to site
                </Link>
                <button onClick={logout} className="w-full rounded-xl px-4 py-2.5 text-start text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/50">
                  Logout
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}