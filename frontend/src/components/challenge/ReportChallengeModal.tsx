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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900"
          >
            <div className="flex items-center justify-between px-5 pt-5 sm:px-7 sm:pt-7">
              <h3 className="flex items-center gap-2 text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">
                <Flag size={18} className="flex-shrink-0 text-amber-500" />
                {t('reportTitle')}
              </h3>
              <button onClick={onClose} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={16} />
              </button>
            </div>

            <div className="overflow-y-auto px-5 pb-5 pt-3 sm:px-7 sm:pb-7">
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
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}