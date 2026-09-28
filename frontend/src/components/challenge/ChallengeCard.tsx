// frontend/src/components/challenge/ChallengeCard.tsx
'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { Challenge } from '@/types';
import { CheckCircle2, Trophy } from 'lucide-react';

const DIFFICULTY_STYLES: Record<string, string> = {
  EASY: 'bg-teal-500/10 text-teal-400 border border-teal-500/20',
  MEDIUM: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  HARD: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  EXPERT: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
};

const fadeUp = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' } },
};

export default function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const locale = useLocale();
  const title = locale === 'ar' ? challenge.titleAr : challenge.titleEn;
  const categoryName = locale === 'ar' ? challenge.category.nameAr : challenge.category.nameEn;

  return (
    <motion.div variants={fadeUp}>
      <Link
        href={`/challenges/${challenge.slug}`}
        className="block p-6 bg-white/[0.03] border border-white/[0.08] backdrop-blur-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] rounded-2xl hover:bg-white/[0.06] transition-all duration-500"
      >
        <div className="flex items-start justify-between mb-3">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${DIFFICULTY_STYLES[challenge.difficulty]}`}>
            {challenge.difficulty}
          </span>
          {challenge.solved && <CheckCircle2 size={20} className="text-teal-400" />}
        </div>

        <h3 className="text-lg font-bold mb-1 text-white">{title}</h3>
        <p className="text-sm text-white/50 mb-4">{categoryName}</p>

        <div className="flex items-center gap-1.5 text-sm font-semibold bg-gradient-to-r from-teal-400 to-purple-500 bg-clip-text text-transparent">
          <Trophy size={16} className="text-teal-400" />
          {challenge.points} pts
        </div>
      </Link>
    </motion.div>
  );
}