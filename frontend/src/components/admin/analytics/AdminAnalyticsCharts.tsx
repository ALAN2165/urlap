'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { animate, motion } from 'framer-motion';
import { AlertOctagon, Lightbulb, Repeat2, TrendingUp, PieChart as PieChartIcon, Flame } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { api } from '@/lib/api';
import { AdminAnalytics, AdminOverview } from '@/types/admin';
import RankedBarList from './RankedBarList';

const STATUS_COLORS: Record<string, string> = {
  ACCEPTED: '#34d399', WRONG_ANSWER: '#f87171', RUNTIME_ERROR: '#fb923c',
  TIME_LIMIT_EXCEEDED: '#fbbf24', COMPILE_ERROR: '#f472b6', MEMORY_LIMIT_EXCEEDED: '#a78bfa',
};
const STATUS_LABELS: Record<string, string> = {
  ACCEPTED: 'Accepted', WRONG_ANSWER: 'Wrong answer', RUNTIME_ERROR: 'Runtime error',
  TIME_LIMIT_EXCEEDED: 'Timeout', COMPILE_ERROR: 'Compile error', MEMORY_LIMIT_EXCEEDED: 'Memory limit',
};

function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const controls = animate(0, value, { duration: 1.1, ease: 'easeOut', onUpdate: (v) => setDisplay(v) });
    return () => controls.stop();
  }, [value]);
  return <>{display.toFixed(decimals)}</>;
}

function Card({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      whileHover={{ y: -3 }}
      className={`glass rounded-3xl p-5 sm:p-6 lg:p-8 ${className}`}
    >
      {children}
    </motion.div>
  );
}

function CardHeader({ icon: Icon, tint, iconClass, title, subtitle }: { icon: LucideIcon; tint: string; iconClass: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${tint}`}>
        <Icon size={18} className={iconClass} />
      </div>
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
    </div>
  );
}

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
  const { data: overview } = useQuery<AdminOverview>({
    queryKey: ['admin-overview'],
    queryFn: async () => (await api.get('/admin/overview')).data,
    refetchInterval: 15000,
  });

  const trendData = (overview?.dailyTrend ?? []).map((d) => ({
    day: new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
    count: d.count,
  }));

  const statusData = (data?.statusBreakdown ?? []).map((s) => ({
    key: s.status,
    name: STATUS_LABELS[s.status] ?? s.status,
    value: s.count,
    fill: STATUS_COLORS[s.status] ?? '#94a3b8',
  }));
  const totalGraded = statusData.reduce((sum, s) => sum + s.value, 0);
  const acceptedCount = statusData.find((s) => s.key === 'ACCEPTED')?.value ?? 0;
  const acceptRate = totalGraded > 0 ? Math.round((acceptedCount / totalGraded) * 100) : 0;

  return (
    <div className="space-y-8 lg:space-y-10">
      {/* Row 1 — headline numbers + 7-day trend */}
      <div className="grid grid-cols-1 gap-6 lg:gap-8 xl:grid-cols-3">
        <Card>
          <CardHeader icon={Repeat2} tint="bg-orange-500/10" iconClass="text-orange-400" title="Avg. Attempts to Solve" subtitle="Platform-wide, across every solved challenge." />
          <div dir="ltr" className="text-5xl font-extrabold text-slate-900 dark:text-white">
            {isLoading ? '—' : <CountUp value={data?.overallAvgAttempts ?? 0} decimals={1} />}
          </div>
          <div className="mt-1 text-xs font-medium text-slate-400 dark:text-slate-500">submissions per solve</div>

          <div className="mt-8 grid grid-cols-2 gap-4 border-t border-slate-200 pt-6 dark:border-slate-700/50">
            <div>
              <div dir="ltr" className="text-2xl font-extrabold text-slate-900 dark:text-white"><CountUp value={totalGraded} /></div>
              <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">graded submissions</div>
            </div>
            <div>
              <div dir="ltr" className="text-2xl font-extrabold text-emerald-500"><CountUp value={acceptRate} />%</div>
              <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">accept rate</div>
            </div>
          </div>
        </Card>

        <Card delay={0.05} className="xl:col-span-2">
          <CardHeader icon={TrendingUp} tint="bg-purple-500/10" iconClass="text-purple-400" title="Submission Volume" subtitle="Last 7 days" />
          {/* Keeps a natural width on phones and swipes inside the card instead of squeezing. */}
          <div className="scroll-thin -mx-1 overflow-x-auto pb-2">
            <div className="min-w-[480px] px-1">
              <ResponsiveContainer width="100%" height={270}>
                <AreaChart data={trendData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trendFill3" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a855f7" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: axisColor }} axisLine={{ stroke: gridColor }} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: axisColor }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={(p: any) => <AreaTooltip {...p} isDark={isDark} />} cursor={{ stroke: '#a855f7', strokeOpacity: 0.3 }} />
                  <Area type="monotone" dataKey="count" stroke="#a855f7" strokeWidth={3} fill="url(#trendFill3)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </div>

      {/* Row 2 — outcomes + hardest */}
      <div className="grid grid-cols-1 gap-6 lg:gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader icon={PieChartIcon} tint="bg-emerald-500/10" iconClass="text-emerald-400" title="Outcome Breakdown" subtitle="How graded submissions ended" />
          {statusData.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-slate-400 dark:text-slate-500">No data yet.</div>
          ) : (
            <>
              <div className="relative">
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={70} outerRadius={100} paddingAngle={3} stroke="none">
                      {statusData.map((s) => <Cell key={s.key} fill={s.fill} />)}
                    </Pie>
                    <Tooltip content={(p: any) => <PieTooltip {...p} isDark={isDark} />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <div dir="ltr" className="text-3xl font-extrabold text-slate-900 dark:text-white"><CountUp value={totalGraded} /></div>
                  <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500">submissions</div>
                </div>
              </div>

              <ul className="mt-6 space-y-3">
                {statusData.map((s) => (
                  <li key={s.key} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2.5 text-slate-600 dark:text-slate-300">
                      <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: s.fill }} />
                      <span className="truncate">{s.name}</span>
                    </span>
                    <span dir="ltr" className="flex-shrink-0 font-mono text-slate-500 dark:text-slate-400">
                      <strong className="text-slate-900 dark:text-white">{s.value}</strong>
                      <span className="ml-2 text-xs">{totalGraded > 0 ? Math.round((s.value / totalGraded) * 100) : 0}%</span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        <Card delay={0.05}>
          <CardHeader icon={Repeat2} tint="bg-orange-500/10" iconClass="text-orange-400" title="Hardest Challenges" subtitle="Average attempts before a student solves it" />
          <RankedBarList
            items={(data?.hardestChallengesByAttempts ?? []).map((c) => ({ label: c.title, detail: `${c.solveCount} solve${c.solveCount !== 1 ? 's' : ''}`, value: c.avgAttempts }))}
            color="#fb923c"
            valueSuffix=" tries"
          />
        </Card>
      </div>

      {/* Row 3 — failures + hints */}
      <div className="grid grid-cols-1 gap-6 lg:gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader icon={AlertOctagon} tint="bg-red-500/10" iconClass="text-red-400" title="Most Failed Challenges" subtitle="Total failed submissions" />
          <RankedBarList
            items={(data?.mostFailedChallenges ?? []).map((c) => ({ label: c.title, detail: `${c.failureRatePct}% of ${c.totalAttempts} attempts fail`, value: c.failedCount }))}
            color="#f87171"
            valueSuffix=" fails"
          />
        </Card>

        <Card delay={0.05}>
          <CardHeader icon={Lightbulb} tint="bg-purple-500/10" iconClass="text-purple-400" title="Most Revealed Hints" subtitle="Distinct students who opened each hint" />
          <RankedBarList
            items={(data?.mostUsedHints ?? []).map((h) => ({ label: `${h.challengeTitle} — Hint ${h.hintOrder}`, value: h.studentCount }))}
            color="#a855f7"
            valueSuffix=" students"
          />
        </Card>
      </div>

      {/* Row 4 — labs, full width */}
      <Card>
        <CardHeader icon={Flame} tint="bg-emerald-500/10" iconClass="text-emerald-400" title="Most Active Labs" subtitle="Challenge completions per lab" />
        <RankedBarList
          items={(overview?.topLabs ?? []).map((l) => ({ label: l.title, value: l.count }))}
          color="#34d399"
          valueSuffix=" completions"
          twoColumn
        />
      </Card>
    </div>
  );
}