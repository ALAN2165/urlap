'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { X, Flag, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useTranslations } from 'next-intl';

interface Props {
  challengeId: string;
  open: boolean;
  onClose: () => void;
}

export default function ReportChallengeModal({ challengeId, open, onClose }: Props) {
  const t = useTranslations('challenge');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submitReport() {
    if (reason.trim().length < 5) {
      toast.error(t('reportTooShort'));
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/reports', { challengeId, reason });
      toast.success(t('reportSent'));
      setReason('');
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || t('reportFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-50 bg-black/50" />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 sm:p-7"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-extrabold text-slate-900 dark:text-white">
                <Flag size={18} className="text-amber-500" />
                {t('reportTitle')}
              </h3>
              <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={16} />
              </button>
            </div>
            <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">{t('reportSubtitle')}</p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder={t('reportPlaceholder')}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white"
            />
            <button
              onClick={submitReport}
              disabled={submitting}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 py-3 text-sm font-bold text-white shadow-[0_0_18px_rgba(245,158,11,0.3)] disabled:opacity-50"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Flag size={16} />}
              {t('reportSubmit')}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}