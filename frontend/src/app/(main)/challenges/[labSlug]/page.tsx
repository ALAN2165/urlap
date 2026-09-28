'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { LabDetail } from '@/types';
import SnakePath from '@/components/challenge/SnakePath';

export default function LabPage() {
  const { labSlug } = useParams<{ labSlug: string }>();
  const { data: lab, isLoading } = useQuery<LabDetail>({
    queryKey: ['lab', labSlug],
    queryFn: async () => (await api.get(`/challenges/labs/${labSlug}`)).data,
  });

  if (isLoading || !lab) return <div className="max-w-6xl mx-auto px-6 py-12 text-slate-500 dark:text-white/50">Loading…</div>;

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-extrabold mb-8 text-slate-900 dark:text-white">
        {lab.titleEn}
      </motion.h1>
      {lab.challenges.length === 0 ? (
        <p className="text-slate-400 dark:text-white/40">No challenges yet — coming soon.</p>
      ) : (
        <div className="p-8 rounded-2xl glass overflow-x-auto">
          <SnakePath labSlug={lab.slug} challenges={lab.challenges} />
        </div>
      )}
    </div>
  );
}