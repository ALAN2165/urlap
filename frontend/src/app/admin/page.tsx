'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, BookOpen, Send, Target, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { AdminOverview, SystemHealth } from '@/types/admin';
import AdminAnalyticsCharts from '@/components/admin/analytics/AdminAnalyticsCharts';

const stagger = { animate: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

const STATUS_META: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  ACCEPTED: { label: 'Accepted', icon: CheckCircle2, className: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  WRONG_ANSWER: { label: 'Wrong answer', icon: XCircle, className: 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20' },
  RUNTIME_ERROR: { label: 'Runtime error', icon: XCircle, className: 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20' },
  TIME_LIMIT_EXCEEDED: { label: 'Timeout', icon: Clock, className: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20' },
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function HealthRow({ label, check }: { label: string; check?: { ok: boolean; detail: string } }) {
  return (
    <div className="flex items-start gap-3 px-5 py-3">
      <span className={`mt-0.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${!check ? 'bg-slate-300 dark:bg-slate-600' : check.ok ? 'bg-emerald-500' : 'bg-red-500'}`} />
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-900 dark:text-white">{label}</div>
        <div className="truncate text-xs text-slate-500 dark:text-slate-400">{check ? check.detail : 'Checking…'}</div>
      </div>
    </div>
  );
}

export default function AdminOverviewPage() {
  const { data, isLoading } = useQuery<AdminOverview>({
    queryKey: ['admin-overview'],
    queryFn: async () => (await api.get('/admin/overview')).data,
    refetchInterval: 15000,
  });

  const { data: health } = useQuery<SystemHealth>({
    queryKey: ['admin-health'],
    queryFn: async () => (await api.get('/admin/health')).data,
    refetchInterval: 20000,
  });

const anyDown = health && (!health.database.ok || !health.redis.ok || !health.sqlGrader.ok || !health.realtimeSchema.ok);
  const stats = [
    { icon: Users, label: 'Total users', value: data?.totalUsers },
    { icon: BookOpen, label: 'Labs / Challenges', value: data ? `${data.totalLabs} / ${data.totalChallenges}` : undefined },
    { icon: Send, label: 'Submissions today', value: data?.submissionsToday },
    { icon: Target, label: 'Platform success rate', value: data ? `${data.platformSuccessRate}%` : undefined },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-6 md:mb-8">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white sm:text-3xl">Overview</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Platform activity at a glance.</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }} className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">System Health</h2>
          {anyDown && (
            <span className="inline-flex items-center gap-1 rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-600 dark:text-red-400">
              <AlertTriangle size={12} />
              Issue detected
            </span>
          )}
        </div>
        <div className="glass divide-y divide-slate-100 overflow-hidden rounded-2xl dark:divide-slate-800/60">
          <HealthRow label="Database" check={health?.database} />
          <HealthRow label="Redis (submission queue)" check={health?.redis} />
          <HealthRow label="SQL grader" check={health?.sqlGrader} />
          <HealthRow label="Realtime / Chat schema" check={health?.realtimeSchema} />
        </div>
      </motion.div>

      <motion.div variants={stagger} initial="initial" animate="animate" className="mb-8 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
        {stats.map((s) => (
          <motion.div key={s.label} variants={fadeUp} className="glass rounded-2xl p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
              <s.icon size={18} className="text-purple-400" />
            </div>
            <div dir="ltr" className="text-xl font-extrabold text-slate-900 dark:text-white sm:text-2xl">
              {isLoading ? '—' : s.value}
            </div>
            <div className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">{s.label}</div>
          </motion.div>
        ))}
      </motion.div>

      <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">Recent submissions</h2>
      <div className="glass mb-8 overflow-hidden rounded-2xl">
        {isLoading && <div className="p-6 text-sm text-slate-500 dark:text-slate-400">Loading…</div>}
        {data && data.recentSubmissions.length === 0 && <div className="p-6 text-sm text-slate-500 dark:text-slate-400">No submissions yet.</div>}
        {data?.recentSubmissions.map((s, i) => {
          const meta = STATUS_META[s.status] ?? STATUS_META.WRONG_ANSWER;
          return (
            <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
              className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-3 last:border-0 dark:border-slate-800/60">
              <div className="flex min-w-0 items-center gap-3">
                <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border ${meta.className}`}>
                  <meta.icon size={14} />
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">{s.username}</div>
                  <div className="truncate text-xs text-slate-500 dark:text-slate-400">{s.challengeTitle}</div>
                </div>
              </div>
              <span className="w-16 flex-shrink-0 text-right text-xs text-slate-400 dark:text-slate-500">{timeAgo(s.createdAt)}</span>
            </motion.div>
          );
        })}
      </div>

      <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">Analytics</h2>
      <AdminAnalyticsCharts />
    </div>
  );
}