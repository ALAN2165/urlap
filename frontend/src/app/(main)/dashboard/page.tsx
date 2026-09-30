'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion, Variants } from 'framer-motion';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, CheckCircle2, Trophy, Zap } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Lab, Stats } from '@/types';
import ProgressRing from '@/components/dashboard/ProgressRing';
import CountUp from '@/components/dashboard/CountUp';

const stagger: Variants = { animate: { transition: { staggerChildren: 0.1 } } };
const fadeUp: Variants = { initial: { opacity: 0, y: 32 }, animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } } };

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const { user } = useAuth();

  const { data: stats } = useQuery<Stats>({
    queryKey: ['stats'],
    queryFn: async () => (await api.get('/auth/stats')).data,
    enabled: !!user,
  });
  const { data: labs } = useQuery<Lab[]>({
    queryKey: ['labs'],
    queryFn: async () => (await api.get('/challenges/labs')).data,
    enabled: !!user,
  });

  if (!user) return null;

  const labList = labs ?? [];
  const solved = stats?.solvedChallenges ?? 0;
  const totalChallenges = stats?.totalChallenges ?? 0;
  const overall = totalChallenges ? solved / totalChallenges : 0;
  const labsCompleted = labList.filter((l) => l.totalChallenges > 0 && l.solvedChallenges === l.totalChallenges).length;

  const statCards = [
    { key: 'points', icon: Zap, label: t('totalPoints'), value: <CountUp to={stats?.totalPoints ?? user.totalPoints} />, hint: null as string | null },
    {
      key: 'labs', icon: CheckCircle2, label: t('labsCompleted'),
      value: (<><CountUp to={labsCompleted} /><span className="text-lg font-semibold text-slate-400 dark:text-slate-500"> / {labList.length}</span></>),
      hint: null,
    },
    {
      key: 'rank', icon: Trophy, label: t('globalRank'),
      value: (<><span className="text-slate-400 dark:text-slate-500">#</span><CountUp to={stats?.rank ?? 0} /></>),
      hint: stats ? t('rankOf', { total: stats.totalUsers }) : null,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-10">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-6 md:mb-8">
        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-purple-500 dark:text-purple-400">{t('overview')}</p>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white sm:text-3xl md:text-4xl">{t('welcome', { name: user.username })}</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 sm:text-base">{t('subtitle')}</p>
      </motion.div>

      <motion.div variants={stagger} initial="initial" animate="animate" className="mb-8 grid grid-cols-1 gap-5 md:mb-10 md:gap-6 lg:grid-cols-3">
        <motion.div variants={fadeUp} className="glass flex flex-col items-center justify-center rounded-3xl p-6 md:p-8">
          <ProgressRing value={overall} size={150} stroke={12}>
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white md:text-4xl">
              <CountUp to={Math.round(overall * 100)} />
              <span className="text-lg text-slate-400 dark:text-slate-500 md:text-xl">%</span>
            </span>
          </ProgressRing>
          <p className="mt-4 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 md:mt-5">{t('overallProgress')}</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            <span className="font-bold text-slate-900 dark:text-white">{solved}</span> / {totalChallenges} {t('challengesSolved')}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 md:gap-6 lg:col-span-2">
          {statCards.map((s) => (
            <motion.div key={s.key} variants={fadeUp} whileHover={{ y: -6 }} className="glass flex flex-col justify-between rounded-3xl p-5 md:p-6">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-500/10 md:mb-6">
                <s.icon size={20} className="text-purple-400" />
              </div>
              <div>
                <div dir="ltr" className="text-2xl font-extrabold text-slate-900 dark:text-white md:text-3xl">{s.value}</div>
                <div className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">{s.label}</div>
                {s.hint && <div className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{s.hint}</div>}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white md:mb-5 md:text-xl">{t('yourLabs')}</h2>
      <motion.div variants={stagger} initial="initial" animate="animate" className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
        {labList.map((lab) => {
          const empty = lab.totalChallenges === 0;
          const pct = empty ? 0 : lab.solvedChallenges / lab.totalChallenges;
          const title = locale === 'ar' ? lab.titleAr : lab.titleEn;

          const card = (
            <motion.div
              variants={fadeUp}
              whileHover={empty ? undefined : { y: -6 }}
              className={`glass flex h-full items-center gap-4 rounded-3xl p-5 sm:gap-5 sm:p-6 ${empty ? 'opacity-60' : ''}`}
            >
              <ProgressRing value={pct} size={72} stroke={7} dim={empty}>
                <span dir="ltr" className="text-sm font-bold text-slate-900 dark:text-white">{Math.round(pct * 100)}%</span>
              </ProgressRing>
              <div className="min-w-0 flex-1">
                <h3 className="mb-1 font-bold leading-snug text-slate-900 dark:text-white">{title}</h3>
                {empty ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t('comingSoon')}</p>
                ) : (
                  <>
                    <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">{t('solvedOf', { solved: lab.solvedChallenges, total: lab.totalChallenges })}</p>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-purple-600 dark:text-purple-400">
                      {lab.solvedChallenges === 0 ? t('start') : t('continue')}
                      <ArrowRight size={14} className="rtl:rotate-180" />
                    </span>
                  </>
                )}
              </div>
            </motion.div>
          );

          return empty
            ? <div key={lab.id} className="cursor-not-allowed">{card}</div>
            : <Link key={lab.id} href={`/challenges/${lab.slug}`} className="block">{card}</Link>;
        })}
      </motion.div>
    </div>
  );
}