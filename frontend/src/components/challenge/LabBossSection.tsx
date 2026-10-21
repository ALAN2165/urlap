'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useLocale } from 'next-intl';
import { Crown, Flame, ArrowRight, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { LabDetail } from '@/types';
import { useExtra } from '@/i18n/extra';
import { AuraFrame, EmberField } from './BossAura';

/** Renders nothing until the student has solved the first 5 challenges; then the Master Challenge appears. */
export default function LabBossSection({ labSlug }: { labSlug: string }) {
  const x = useExtra();
  const locale = useLocale();
  const reduce = useReducedMotion();
  const [reveal, setReveal] = useState(false);

  const { data: lab } = useQuery<LabDetail>({
    queryKey: ['lab', labSlug],
    queryFn: async () => (await api.get(`/challenges/labs/${labSlug}`)).data,
  });
  const boss = lab?.boss ?? null;

  // The dramatic "it appears" intro plays once per student per boss.
  useEffect(() => {
    if (!boss) return;
    const key = `urlap:boss-seen:${boss.id}`;
    let seen = true;
    try { seen = localStorage.getItem(key) === '1'; } catch { /* storage unavailable */ }
    if (seen) return;
    setReveal(true);
    const id = setTimeout(() => {
      setReveal(false);
      try { localStorage.setItem(key, '1'); } catch { /* ignore */ }
    }, reduce ? 800 : 3400);
    return () => clearTimeout(id);
  }, [boss?.id, reduce]);

  if (!boss) return null;
  const title = locale === 'ar' ? boss.titleAr : boss.titleEn;

  return (
    <section className="mx-auto max-w-5xl px-4 pb-20 sm:px-6">
      <motion.div initial={{ opacity: 0, y: 40, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.8, ease: 'easeOut' }}>
        <AuraFrame>
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-[#1a0a14] to-slate-950 px-6 py-12 sm:px-12 sm:py-16">
            <EmberField />
            <motion.div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-64 w-[120%] -translate-x-1/2 rounded-full bg-rose-600/25 blur-3xl"
              animate={reduce ? undefined : { opacity: [0.5, 1, 0.5], scale: [1, 1.1, 1] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} />

            <div className="relative z-10 flex flex-col items-center text-center">
              <motion.div animate={reduce ? undefined : { y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 via-rose-500 to-purple-600 shadow-[0_0_50px_rgba(244,63,94,0.7)]">
                <Crown size={36} className="text-white" />
              </motion.div>

              <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-1 text-[11px] font-extrabold uppercase tracking-[0.25em] text-amber-300">
                <Flame size={12} /> {x('finalTrial')}
              </span>
              <h2 className="bg-gradient-to-r from-amber-300 via-rose-400 to-purple-400 bg-clip-text text-3xl font-black text-transparent sm:text-5xl">{title}</h2>
              <p className="mt-3 max-w-md text-sm text-slate-300">{x('bossIntro')}</p>

              <div className="mt-5 flex items-center gap-3 text-sm font-bold">
                <span className="rounded-full bg-rose-500/15 px-3 py-1 text-rose-300">{boss.difficulty}</span>
                <span className="text-amber-300">{boss.points} pts</span>
                {boss.solved && <span className="flex items-center gap-1 text-emerald-300"><CheckCircle2 size={15} /> {x('bossConquered')}</span>}
              </div>

              <Link href={`/challenges/${labSlug}/${boss.slug}`}
                className="group mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-600 via-red-600 to-amber-500 px-8 py-3.5 text-sm font-extrabold text-white shadow-[0_0_35px_rgba(244,63,94,0.6)] transition-transform hover:-translate-y-1 hover:shadow-[0_0_55px_rgba(244,63,94,0.85)]">
                {x('bossCta')}
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
              </Link>
            </div>

            <AnimatePresence>
              {reveal && (
                <motion.div key="reveal" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.9 }}
                  className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black px-6 text-center">
                  <motion.span aria-hidden className="absolute h-40 w-40 rounded-full border-2 border-rose-500"
                    initial={{ scale: 0.2, opacity: 1 }} animate={{ scale: 7, opacity: 0 }} transition={{ duration: 2.2, ease: 'easeOut', repeat: Infinity }} />
                  <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 120, damping: 12 }}>
                    <Crown size={54} className="mx-auto mb-4 text-amber-300" />
                  </motion.div>
                  <motion.h3 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="relative text-2xl font-black text-white sm:text-4xl">{x('bossRevealTitle')}</motion.h3>
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="relative mt-3 max-w-md text-sm text-rose-200">{x('bossRevealBody')}</motion.p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </AuraFrame>
      </motion.div>
    </section>
  );
}