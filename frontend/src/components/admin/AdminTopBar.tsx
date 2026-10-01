'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import { SystemHealth } from '@/types/admin';

const TITLES: Record<string, string> = {
  '/admin': 'Overview',
  '/admin/challenges': 'Challenges Manager',
  '/admin/users': 'Users Manager',
  '/admin/announcements': 'Announcements Manager',
};

export default function AdminTopBar() {
  const pathname = usePathname();
  const title = TITLES[pathname ?? ''] ?? 'Admin';

  // Shares the 'admin-health' query key with the Overview page, so this
  // never fires a duplicate network request when both are mounted.
  const { data: health } = useQuery<SystemHealth>({
    queryKey: ['admin-health'],
    queryFn: async () => (await api.get('/admin/health')).data,
    refetchInterval: 20000,
  });

  const allOk = health ? health.database.ok && health.redis.ok && health.sqlGrader.ok : null;

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 md:mb-8">
      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white sm:text-3xl">{title}</h1>

      <div className="flex items-center gap-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
            allOk === null
              ? 'border-slate-300 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400'
              : allOk
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${allOk === null ? 'bg-slate-400' : allOk ? 'bg-emerald-500' : 'bg-red-500'}`} />
          {allOk === null ? 'Checking…' : allOk ? 'All systems operational' : 'Issue detected'}
        </span>
        <Link href="/" className="inline-flex items-center gap-1.5 rounded-full glass px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
          View site
          <ExternalLink size={13} />
        </Link>
      </div>
    </div>
  );
}