'use client';

import { useQuery } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import { AlertOctagon, Lightbulb, Repeat2, TrendingUp, PieChart as PieChartIcon, Flame } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { api } from '@/lib/api';
import { AdminAnalytics, AdminOverview } from '@/types/admin';
import HorizontalBarChart from './HorizontalBarChart';

function truncate(s: string, n = 30) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

const STATUS_COLORS: Record<string, string> = {
  ACCEPTED: '#34d399', WRONG_ANSWER: '#f87171', RUNTIME_ERROR: '#fb923c',
  TIME_LIMIT_EXCEEDED: '#fbbf24', COMPILE_ERROR: '#f472b6', MEMORY_LIMIT_EXCEEDED: '#a78bfa',
};
const STATUS_LABELS: Record<string, string> = {
  ACCEPTED: 'Accepted', WRONG_ANSWER: 'Wrong answer', RUNTIME_ERROR: 'Runtime error',
  TIME_LIMIT_EXCEEDED: 'Timeout', COMPILE_ERROR: 'Compile error', MEMORY_LIMIT_EXCEEDED: 'Memory limit',
};

function AreaTooltip({ active, payload, label, isDark }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: isDark ? '#15101f' : '#fff', border: `1px solid ${isDark ? 'rgba(168,85,247,0.35)' : '#e2e8f0'}`, borderRadius: 12, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ color: isDark ? '#fff' : '#0f172a', fontWeight: 700, marginBottom: 2 }}>{label}</div>
      <div style={{ color: isDark ? '#c4b5fd' : '#7c3aed', fontWeight: 600 }}>{payload[0].value} submissions</div>
    </div>
  );
}

function PieTooltip({ active, payload, isDark }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div style={{ background: isDark ? '#15101f' : '#fff', border: `1px solid ${isDark ? 'rgba(168,85,247,0.35)' : '#e2e8f0'}`, borderRadius: 12, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ color: p.payload.fill, fontWeight: 700 }}>{p.name}</div>
      <div style={{ color: isDark ? '#fff' : '#0f172a' }}>{p.value} submissions</div>
    </div>
  );
}

export default function AdminAnalyticsCharts() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const axisColor = isDark ? '#a9a2c3' : '#475569';
  const gridColor = isDark ? 'rgba(148,163,184,0.1)' : 'rgba(100,116,139,0.12)';

  const { data, isLoading } = useQuery<AdminAnalytics>({
    queryKey: ['admin-analytics'],
    queryFn: async () => (await api.get('/admin/analytics')).data,
    refetchInterval: 60000,
  });

  // Shares its cache with the Overview page (same query key) — no duplicate request.
  const { data: overview } = useQuery<AdminOverview>({
    queryKey: ['admin-overview'],
    queryFn: async () => (await api.get('/admin/overview')).data,
    refetchInterval: 15000,
  });

  const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

  const trendData = (overview?.dailyTrend ?? []).map((d) => ({
    day: new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
    count: d.count,
  }));

  const statusData = (data?.statusBreakdown ?? []).map((s) => ({
    name: STATUS_LABELS[s.status] ?? s.status,
    value: s.count,
    fill: STATUS_COLORS[s.status] ?? '#94a3b8',
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <motion.div {...fadeUp} className="glass rounded-2xl p-5 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
              <TrendingUp size={15} className="text-purple-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Submission Volume — Last 7 Days</h3>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={trendData} margin={{ top: 4, right: 12, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: axisColor }} axisLine={{ stroke: gridColor }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={(p: any) => <AreaTooltip {...p} isDark={isDark} />} cursor={{ stroke: '#a855f7', strokeOpacity: 0.3 }} />
              <Area type="monotone" dataKey="count" stroke="#a855f7" strokeWidth={2.5} fill="url(#trendFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div {...fadeUp} transition={{ delay: 0.05 }} className="glass rounded-2xl p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
              <PieChartIcon size={15} className="text-emerald-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Outcome Breakdown</h3>
          </div>
          {statusData.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center text-sm text-slate-400 dark:text-slate-500">No data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={78} paddingAngle={3}>
                  {statusData.map((s, i) => <Cell key={i} fill={s.fill} stroke="none" />)}
                </Pie>
                <Tooltip content={(p: any) => <PieTooltip {...p} isDark={isDark} />} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1">
            {statusData.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.fill }} />
                {s.name}
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="glass flex flex-col justify-center rounded-2xl p-5 lg:col-span-1">
          <div className="mb-1 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
              <Repeat2 size={15} className="text-orange-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Avg. Attempts to Solve</h3>
          </div>
          <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">Platform-wide, across every solved challenge.</p>
          <div dir="ltr" className="text-4xl font-extrabold text-slate-900 dark:text-white">{isLoading ? '—' : (data?.overallAvgAttempts ?? 0).toFixed(1)}</div>
          <div className="mt-1 text-xs font-medium text-slate-400 dark:text-slate-500">submissions per solve</div>
        </motion.div>

        <motion.div {...fadeUp} transition={{ delay: 0.15 }} className="glass rounded-2xl p-5 lg:col-span-2">
          <div className="mb-1 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
              <Repeat2 size={15} className="text-orange-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Hardest Challenges (by Avg. Attempts)</h3>
          </div>
          <HorizontalBarChart
            data={(data?.hardestChallengesByAttempts ?? []).map((c) => ({ label: truncate(c.title), fullLabel: c.title, value: c.avgAttempts }))}
            color="#fb923c"
            valueLabel="tries"
          />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="glass rounded-2xl p-5">
          <div className="mb-1 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
              <AlertOctagon size={15} className="text-red-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Most Failed Challenges</h3>
          </div>
          <HorizontalBarChart
            data={(data?.mostFailedChallenges ?? []).map((c) => ({ label: truncate(c.title), fullLabel: `${c.title} — ${c.failureRatePct}% fail rate`, value: c.failedCount }))}
            color="#f87171"
            valueLabel="fails"
          />
        </motion.div>

        <motion.div {...fadeUp} transition={{ delay: 0.25 }} className="glass rounded-2xl p-5">
          <div className="mb-1 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
              <Lightbulb size={15} className="text-purple-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Most Revealed Hints</h3>
          </div>
          <HorizontalBarChart
            data={(data?.mostUsedHints ?? []).map((h) => ({ label: truncate(`${h.challengeTitle} — H${h.hintOrder}`, 28), fullLabel: `${h.challengeTitle} — Hint ${h.hintOrder}`, value: h.studentCount }))}
            color="#a855f7"
            valueLabel="students"
          />
        </motion.div>
      </div>

      <motion.div {...fadeUp} transition={{ delay: 0.3 }} className="glass rounded-2xl p-5">
        <div className="mb-1 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
            <Flame size={15} className="text-emerald-400" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Most Active Labs (by Completions)</h3>
        </div>
        <HorizontalBarChart
          data={(overview?.topLabs ?? []).map((l) => ({ label: truncate(l.title), fullLabel: l.title, value: l.count }))}
          color="#34d399"
          valueLabel="completions"
        />
      </motion.div>
    </div>
  );
}