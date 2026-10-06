'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { AlertOctagon, Lightbulb, Repeat2 } from 'lucide-react';
import { api } from '@/lib/api';
import { AdminAnalytics } from '@/types/admin';
import HorizontalBarChart from './HorizontalBarChart';

function truncate(s: string, n = 26) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

export default function AdminAnalyticsCharts() {
  const { data, isLoading } = useQuery<AdminAnalytics>({
    queryKey: ['admin-analytics'],
    queryFn: async () => (await api.get('/admin/analytics')).data,
    refetchInterval: 60000,
  });

  const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <motion.div {...fadeUp} className="glass rounded-2xl p-5 lg:col-span-1">
          <div className="mb-1 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
              <Repeat2 size={15} className="text-red-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Avg. Attempts to Solve</h3>
          </div>
          <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">Platform-wide, across every solved challenge.</p>
          <div dir="ltr" className="text-4xl font-extrabold text-slate-900 dark:text-white">
            {isLoading ? '—' : (data?.overallAvgAttempts ?? 0).toFixed(1)}
          </div>
          <div className="mt-1 text-xs font-medium text-slate-400 dark:text-slate-500">submissions per solve</div>
        </motion.div>

        <motion.div {...fadeUp} transition={{ delay: 0.05 }} className="glass rounded-2xl p-5 lg:col-span-2">
          <div className="mb-1 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
              <Repeat2 size={15} className="text-orange-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Hardest Challenges (by Avg. Attempts)</h3>
          </div>
          <HorizontalBarChart
            data={(data?.hardestChallengesByAttempts ?? []).map((c) => ({ label: truncate(c.title), value: c.avgAttempts }))}
            color="#fb923c"
            valueSuffix=" tries"
          />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="glass rounded-2xl p-5">
          <div className="mb-1 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
              <AlertOctagon size={15} className="text-red-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Most Failed Challenges</h3>
          </div>
          <HorizontalBarChart
            data={(data?.mostFailedChallenges ?? []).map((c) => ({ label: truncate(c.title), value: c.failedCount }))}
            color="#f87171"
            valueSuffix=" fails"
          />
        </motion.div>

        <motion.div {...fadeUp} transition={{ delay: 0.15 }} className="glass rounded-2xl p-5">
          <div className="mb-1 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
              <Lightbulb size={15} className="text-purple-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Most Revealed Hints</h3>
          </div>
          <HorizontalBarChart
            data={(data?.mostUsedHints ?? []).map((h) => ({ label: `${truncate(h.challengeTitle, 18)} — H${h.hintOrder}`, value: h.studentCount }))}
            color="#a855f7"
            valueSuffix=" students"
          />
        </motion.div>
      </div>
    </div>
  );
}