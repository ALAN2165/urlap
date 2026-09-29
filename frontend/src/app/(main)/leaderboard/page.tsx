'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Trophy } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { LeaderboardEntry, Stats } from '@/types';
import AvatarCircle from '@/components/shared/AvatarCircle';

const stagger = { animate: { transition: { staggerChildren: 0.04 } } };
const fadeUp = { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

const RANK_ACCENT: Record<number, string> = {
  1: 'text-amber-400',
  2: 'text-slate-300',
  3: 'text-orange-400',
};

export default function LeaderboardPage() {
  const t = useTranslations('leaderboard');
  const { user } = useAuthStore();

  const { data: entries, isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard'],
    queryFn: async () => (await api.get('/leaderboard')).data,
  });

  const { data: stats } = useQuery<Stats>({
    queryKey: ['stats'],
    queryFn: async () => (await api.get('/auth/stats')).data,
    enabled: !!user,
  });

  const isHidden = user && user.showInLeaderboard === false;
  const meInList = !!(user && entries?.some((e) => e.username === user.username));
  const showPinnedRow = !!user && !meInList && !!stats;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-8 text-center">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10">
          <Trophy size={22} className="text-purple-400" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">{t('title')}</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">{t('subtitle')}</p>
      </motion.div>

      {isHidden && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass mb-6 rounded-2xl p-4 text-center text-sm text-slate-600 dark:text-slate-400">
          {t('hiddenNotice')} — <Link href="/profile" className="font-semibold text-purple-600 hover:underline dark:text-purple-400">{t('hiddenAction')}</Link>
        </motion.div>
      )}

      {isLoading && (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800/50" />)}
        </div>
      )}

      {entries && entries.length === 0 && <p className="py-12 text-center text-slate-500 dark:text-slate-400">{t('empty')}</p>}

      {entries && entries.length > 0 && (
        <motion.div variants={stagger} initial="initial" animate="animate" className="glass overflow-hidden rounded-2xl">
          <div className="flex items-center gap-4 border-b border-slate-200 px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-400 dark:border-slate-700/50 dark:text-slate-500">
            <span className="w-8 text-center">{t('rank')}</span>
            <span className="flex-1">{t('player')}</span>
            <span>{t('points')}</span>
          </div>

          {entries.map((entry) => {
            const isMe = user?.username === entry.username;
            const isTop3 = entry.rank <= 3;
            return (
              <motion.div
                key={entry.id}
                variants={fadeUp}
                className={`flex items-center gap-4 border-b border-slate-100 px-5 py-3 transition-colors last:border-0 dark:border-slate-800/60 ${
                  isMe ? 'bg-purple-500/5' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                }`}
              >
                <span className={`w-8 text-center font-mono text-sm font-bold ${isTop3 ? RANK_ACCENT[entry.rank] : 'text-slate-400 dark:text-slate-500'}`}>
                  {entry.rank}
                </span>
                <AvatarCircle name={entry.username} size={36} />
                <span className="flex-1 truncate font-semibold text-slate-900 dark:text-white">{entry.username}</span>
                <span className="font-mono text-sm font-bold text-purple-600 dark:text-purple-400">{entry.totalPoints}</span>
              </motion.div>
            );
          })}

          {showPinnedRow && stats && user && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
              className="flex items-center gap-4 border-t-2 border-purple-500/30 bg-slate-100 px-5 py-3 dark:bg-slate-700/40">
              <span className="w-8 text-center font-mono text-sm font-bold text-slate-500 dark:text-slate-300">{stats.rank}</span>
              <AvatarCircle name={user.username} size={36} />
              <span className="flex flex-1 items-center gap-2 truncate font-semibold text-slate-900 dark:text-white">
                {user.username}
                <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-400">{t('you')}</span>
              </span>
              <span className="font-mono text-sm font-bold text-purple-600 dark:text-purple-400">{user.totalPoints}</span>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}