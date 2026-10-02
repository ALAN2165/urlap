'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Lab } from '@/types';
import QueryLoader from '@/components/shared/QueryLoader';

const containerStagger = { animate: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

export default function LabsPage() {
  const { data: labs, isLoading } = useQuery<Lab[]>({
    queryKey: ['labs'],
    queryFn: async () => (await api.get('/challenges/labs')).data,
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-extrabold mb-2 text-slate-900 dark:text-white">
        SQL Labs
      </motion.h1>
      <p className="text-slate-500 dark:text-white/50 mb-8">Work through each lab in order — challenges unlock as you solve them.</p>

      {isLoading && <QueryLoader />}

      {labs && (
        <motion.div variants={containerStagger} initial="initial" animate="animate" className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {labs.map((lab) => {
            const pct = lab.totalChallenges ? Math.round((lab.solvedChallenges / lab.totalChallenges) * 100) : 0;
            const empty = lab.totalChallenges === 0;

            return (
              <motion.div key={lab.id} variants={fadeUp}>
                <Link href={empty ? '#' : `/challenges/${lab.slug}`}
                  className={`block p-6 rounded-2xl glass transition-all duration-500 ${empty ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-1'}`}>
                  <h3 className="text-lg font-bold mb-1 text-slate-900 dark:text-white">{lab.titleEn}</h3>
                  {empty ? (
                    <p className="text-sm text-slate-400 dark:text-white/40">Coming soon</p>
                  ) : (
                    <>
                      <p className="text-sm text-slate-500 dark:text-white/50 mb-3">{lab.solvedChallenges} / {lab.totalChallenges} solved</p>
                      <div className="h-2 rounded-full bg-slate-200 dark:bg-white/[0.06] overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-purple-500 to-purple-700 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </>
                  )}
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}