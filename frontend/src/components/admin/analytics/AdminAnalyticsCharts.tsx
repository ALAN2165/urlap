'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { animate, motion } from 'framer-motion';
import { AlertOctagon, Lightbulb, Repeat2, TrendingUp, FlaskConical, Flame } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { AdminAnalytics, AdminOverview } from '@/types/admin';
import RankedBarList from './RankedBarList';
import LiquidSetup from './liquid/LiquidSetup';
import LiquidGauge from './liquid/LiquidGauge';
import LiquidVial from './liquid/LiquidVial';
import type { VialLayer } from './liquid/LiquidVial';
import LiquidAreaChart from './liquid/LiquidAreaChart';
import { LIQUID, STATUS_COLORS } from './liquid/palette';

const STATUS_LABELS: Record<string, string> = {
  ACCEPTED: 'Accepted', WRONG_ANSWER: 'Wrong answer', RUNTIME_ERROR: 'Runtime error',
  TIME_LIMIT_EXCEEDED: 'Timeout', COMPILE_ERROR: 'Compile error', MEMORY_LIMIT_EXCEEDED: 'Memory limit',
};

function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const controls = animate(0, value, { duration: 1.4, ease: 'easeOut', onUpdate: (v) => setDisplay(v) });
    return () => controls.stop();
  }, [value]);
  return <>{display.toFixed(decimals)}</>;
}

function Card({ children, className = '', delay = 0, accent = LIQUID.lavender }: { children: React.ReactNode; className?: string; delay?: number; accent?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      whileHover={{ y: -3 }}
      className={`glass relative overflow-hidden rounded-3xl p-5 sm:p-6 lg:p-8 ${className}`}
    >
      {/* slow-drifting ambient glow, like light moving through the liquid */}
      <span aria-hidden className="liquid-blob pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full opacity-[0.12] blur-3xl" style={{ background: accent }} />
      <div className="relative z-10">{children}</div>
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

export default function AdminAnalyticsCharts() {
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
    label: new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
    value: d.count,
  }));

  // Accepted sits at the bottom of the vial, the rest stack above it by size.
  const rawStatus = data?.statusBreakdown ?? [];
  const accepted = rawStatus.filter((s) => s.status === 'ACCEPTED');
  const others = rawStatus.filter((s) => s.status !== 'ACCEPTED').sort((a, b) => b.count - a.count);
  const layers: VialLayer[] = [...accepted, ...others].map((s) => ({
    key: s.status,
    name: STATUS_LABELS[s.status] ?? s.status,
    value: s.count,
    color: STATUS_COLORS[s.status] ?? LIQUID.iris,
  }));
  const totalGraded = layers.reduce((sum, l) => sum + l.value, 0);
  const acceptedCount = layers.find((l) => l.key === 'ACCEPTED')?.value ?? 0;
  const acceptRate = totalGraded > 0 ? Math.round((acceptedCount / totalGraded) * 100) : 0;

  return (
    <div className="space-y-8 lg:space-y-10">
      <LiquidSetup />

      {/* Row 1 — attempts + accept-rate orb, and the 7-day trend */}
      <div className="grid grid-cols-1 gap-6 lg:gap-8 xl:grid-cols-3">
        <Card accent={LIQUID.peach}>
          <CardHeader icon={Repeat2} tint="bg-orange-400/10" iconClass="text-orange-300" title="Avg. Attempts to Solve" subtitle="Platform-wide, across every solved challenge." />
          <div dir="ltr" className="text-5xl font-extrabold text-slate-900 dark:text-white">
            {isLoading ? '—' : <CountUp value={data?.overallAvgAttempts ?? 0} decimals={1} />}
          </div>
          <div className="mt-1 text-xs font-medium text-slate-400 dark:text-slate-500">submissions per solve</div>

          <div className="mt-8 border-t border-slate-200 pt-8 dark:border-slate-700/50">
            <LiquidGauge percent={acceptRate} color={LIQUID.sage} size={180}>
              <div className="text-center">
                <div dir="ltr" className="text-3xl font-extrabold text-slate-900 [text-shadow:0_0_12px_rgba(255,255,255,0.2)] dark:text-white">
                  <CountUp value={acceptRate} />%
                </div>
                <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">accept rate</div>
              </div>
            </LiquidGauge>
            <div className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
              <span dir="ltr" className="font-bold text-slate-900 dark:text-white"><CountUp value={totalGraded} /></span> graded submissions
            </div>
          </div>
        </Card>

        <Card delay={0.05} className="xl:col-span-2" accent={LIQUID.lavender}>
          <CardHeader icon={TrendingUp} tint="bg-violet-400/10" iconClass="text-violet-300" title="Submission Volume" subtitle="Last 7 days — hover to inspect a day" />
          <LiquidAreaChart data={trendData} color={LIQUID.lavender} unit="submissions" />
        </Card>
      </div>

      {/* Row 2 — outcome vial + hardest challenges */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        <Card accent={LIQUID.sage}>
          <CardHeader icon={FlaskConical} tint="bg-emerald-400/10" iconClass="text-emerald-300" title="Outcome Breakdown" subtitle="How graded submissions ended" />
          {layers.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-slate-400 dark:text-slate-500">No data yet.</div>
          ) : (
            <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-center">
              <div className="flex-shrink-0"><LiquidVial layers={layers} /></div>
              {/* legend is reversed so its top-to-bottom order matches the layers in the vial */}
              <ul className="w-full flex-1 space-y-3.5">
                {[...layers].reverse().map((l) => (
                  <li key={l.key} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2.5 text-slate-600 dark:text-slate-300">
                      <span className="h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: l.color, boxShadow: `0 0 8px ${l.color}55` }} />
                      <span className="truncate">{l.name}</span>
                    </span>
                    <span dir="ltr" className="flex-shrink-0 font-mono text-slate-500 dark:text-slate-400">
                      <strong className="text-slate-900 dark:text-white">{l.value}</strong>
                      <span className="ml-2 text-xs">{totalGraded > 0 ? Math.round((l.value / totalGraded) * 100) : 0}%</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card delay={0.05} accent={LIQUID.peach}>
          <CardHeader icon={Repeat2} tint="bg-orange-400/10" iconClass="text-orange-300" title="Hardest Challenges" subtitle="Average attempts before a student solves it" />
          <RankedBarList
            items={(data?.hardestChallengesByAttempts ?? []).map((c) => ({ label: c.title, detail: `${c.solveCount} solve${c.solveCount !== 1 ? 's' : ''}`, value: c.avgAttempts }))}
            color={LIQUID.peach}
            valueSuffix=" tries"
          />
        </Card>
      </div>

      {/* Row 3 — failures + hints */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        <Card accent={LIQUID.coral}>
          <CardHeader icon={AlertOctagon} tint="bg-rose-400/10" iconClass="text-rose-300" title="Most Failed Challenges" subtitle="Total failed submissions" />
          <RankedBarList
            items={(data?.mostFailedChallenges ?? []).map((c) => ({ label: c.title, detail: `${c.failureRatePct}% of ${c.totalAttempts} attempts fail`, value: c.failedCount }))}
            color={LIQUID.coral}
            valueSuffix=" fails"
          />
        </Card>

        <Card delay={0.05} accent={LIQUID.lavender}>
          <CardHeader icon={Lightbulb} tint="bg-violet-400/10" iconClass="text-violet-300" title="Most Revealed Hints" subtitle="Distinct students who opened each hint" />
          <RankedBarList
            items={(data?.mostUsedHints ?? []).map((h) => ({ label: `${h.challengeTitle} — Hint ${h.hintOrder}`, value: h.studentCount }))}
            color={LIQUID.lavender}
            valueSuffix=" students"
          />
        </Card>
      </div>

      {/* Row 4 — labs, full width */}
      <Card accent={LIQUID.sage}>
        <CardHeader icon={Flame} tint="bg-emerald-400/10" iconClass="text-emerald-300" title="Most Active Labs" subtitle="Challenge completions per lab" />
        <RankedBarList
          items={(overview?.topLabs ?? []).map((l) => ({ label: l.title, value: l.count }))}
          color={LIQUID.sage}
          valueSuffix=" completions"
          twoColumn
        />
      </Card>
    </div>
  );
}