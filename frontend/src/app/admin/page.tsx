'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, BookOpen, Send, Target, CheckCircle2, XCircle, Clock, Database, Server, Terminal } from 'lucide-react';
import { api } from '@/lib/api';
import { AdminOverview, SystemHealth } from '@/types/admin';
import AdminStatCard from '@/components/admin/AdminStatCard';
import AdminTrendChart from '@/components/admin/AdminTrendChart';
import AdminHealthCard from '@/components/admin/AdminHealthCard';

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

  const submissionsDeltaPct =
    data && data.submissionsYesterday > 0
      ? Math.round(((data.submissionsToday - data.submissionsYesterday) / data.submissionsYesterday) * 100)
      : null;

  return (
    <div className="mx-auto max-w-6xl">
      <motion.div variants={stagger} initial="initial" animate="animate" className="mb-6 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
        <AdminStatCard icon={Users} label="Total users" value={data?.totalUsers} loading={isLoading} />
        <AdminStatCard icon={BookOpen} label="Labs / Challenges" value={data ? `${data.totalLabs} / ${data.totalChallenges}` : undefined} loading={isLoading} />
        <AdminStatCard icon={Send} label="Submissions today" value={data?.submissionsToday} deltaPct={submissionsDeltaPct} loading={isLoading} />
        <AdminStatCard icon={Target} label="Platform success rate" value={data ? `${data.platformSuccessRate}%` : undefined} loading={isLoading} />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }} className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <AdminHealthCard icon={Database} label="Database" ok={health?.database.ok} detail={health?.database.detail} />
        <AdminHealthCard icon={Server} label="Redis (queue)" ok={health?.redis.ok} detail={health?.redis.detail} />
        <AdminHealthCard icon={Terminal} label="SQL grader" ok={health?.sqlGrader.ok} detail={health?.sqlGrader.detail} />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AdminTrendChart data={data?.dailyTrend ?? []} />
        </div>
        <div className="glass rounded-2xl p-5">
          <h3 className="mb-4 text-sm font-bold text-slate-900 dark:text-white">Most active labs</h3>
          <div className="space-y-3">
            {data?.topLabs.map((lab, i) => (
              <div key={lab.labId} className="flex items-center gap-3">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-xs font-bold text-purple-500 dark:text-purple-400">{i + 1}</span>
                <span className="flex-1 truncate text-sm font-medium text-slate-700 dark:text-slate-300">{lab.title}</span>
                <span className="flex-shrink-0 text-xs font-bold text-slate-400 dark:text-slate-500">{lab.count}</span>
              </div>
            ))}
            {(!data || data.topLabs.length === 0) && <p className="text-xs text-slate-400 dark:text-slate-500">No completions yet.</p>}
          </div>
        </div>
      </motion.div>

      <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">Recent activity</h2>
      <div className="glass overflow-hidden rounded-2xl">
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
    </div>
  );
}