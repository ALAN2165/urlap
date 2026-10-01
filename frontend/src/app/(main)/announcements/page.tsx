'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useLocale, useTranslations } from 'next-intl';
import { Megaphone, Rocket, Sparkles, Wrench, Info } from 'lucide-react';
import { api } from '@/lib/api';
import { Announcement, AnnouncementType } from '@/types';

const stagger = { animate: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

const TYPE_META: Record<AnnouncementType, { Icon: typeof Info; className: string }> = {
  INFO: { Icon: Info, className: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20' },
  NEW_LAB: { Icon: Rocket, className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' },
  FEATURE: { Icon: Sparkles, className: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20' },
  MAINTENANCE: { Icon: Wrench, className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20' },
};

export default function AnnouncementsPage() {
  const t = useTranslations('announcements');
  const locale = useLocale();

  const { data: announcements, isLoading } = useQuery<Announcement[]>({
    queryKey: ['announcements'],
    queryFn: async () => (await api.get('/announcements')).data,
  });

  const badgeLabel = (type: AnnouncementType) =>
    type === 'NEW_LAB' ? t('badgeNewLab') : type === 'FEATURE' ? t('badgeFeature') : type === 'MAINTENANCE' ? t('badgeMaintenance') : t('badgeInfo');

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 md:py-12">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-8 text-center">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10">
          <Megaphone size={22} className="text-purple-400" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">{t('title')}</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">{t('subtitle')}</p>
      </motion.div>

      {isLoading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800/50" />)}
        </div>
      )}

      {announcements && announcements.length === 0 && <p className="py-12 text-center text-slate-500 dark:text-slate-400">{t('empty')}</p>}

      {announcements && announcements.length > 0 && (
        <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-4">
          {announcements.map((a) => {
            const { Icon, className } = TYPE_META[a.type];
            const title = locale === 'ar' ? a.titleAr : a.titleEn;
            const content = locale === 'ar' ? a.contentAr : a.contentEn;
            const date = new Date(a.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });

            return (
              <motion.div key={a.id} variants={fadeUp} whileHover={{ y: -4 }} className="glass rounded-3xl p-6">
                <div className="mb-3 flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${className}`}>
                    <Icon size={13} />
                    {badgeLabel(a.type)}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">{date}</span>
                </div>
                <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
                <p className="leading-relaxed text-slate-600 dark:text-slate-400">{content}</p>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}