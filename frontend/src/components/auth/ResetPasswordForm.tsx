'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import Link from 'next/link';
import { Lock, ArrowRight, ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import LogoOrb from '@/components/shared/LogoOrb';

const schema = z
  .object({ password: z.string().min(8), confirmPassword: z.string().min(8) })
  .refine((data) => data.password === data.confirmPassword, { message: 'Passwords do not match.', path: ['confirmPassword'] });
type FormData = z.infer<typeof schema>;

export default function ResetPasswordForm() {
  const t = useTranslations('resetPassword');
  const tf = useTranslations('forgotPassword');
  const router = useRouter();
  const token = useSearchParams().get('token');

  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    if (!token) return;
    setError('');
    try {
      await api.post('/auth/reset-password', { token, password: data.password });
      setDone(true);
      toast.success(t('success'));
      setTimeout(() => router.push('/login'), 2000);
    } catch (err: any) {
      const msg = err?.response?.data?.error || t('genericError');
      setError(msg);
      toast.error(msg);
    }
  }

  const shell = (children: React.ReactNode) => (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }} className="w-full max-w-md p-6 rounded-3xl glass sm:p-10">
      <div className="flex justify-center mb-6 lg:hidden">
        <LogoOrb size={100} imgSize={52} />
      </div>
      {children}
    </motion.div>
  );

  if (!token) {
    return shell(
      <div className="text-center py-4">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
          <XCircle size={28} className="text-red-500" />
        </div>
        <h1 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">{t('invalidToken')}</h1>
        <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">{t('invalidTokenDesc')}</p>
        <Link href="/forgot-password" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-purple-800 px-6 py-3 text-sm font-bold text-white shadow-[0_0_20px_rgba(147,51,234,0.3)]">
          {t('requestNewLink')}
        </Link>
      </div>
    );
  }

  if (done) {
    return shell(
      <div className="text-center py-4">
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle2 size={28} className="text-emerald-500" />
        </motion.div>
        <h1 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">{t('success')}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">{t('successDesc')}</p>
      </div>
    );
  }

  return shell(
    <>
      <h1 className="text-2xl font-bold mb-1 sm:text-3xl">{t('title')}</h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-7 sm:mb-8">{t('subtitle')}</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{t('newPassword')}</label>
          <div className="relative mt-2">
            <Lock size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 rtl:left-auto rtl:right-4" />
            <input {...register('password')} type="password"
              className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:outline-none transition text-slate-900 dark:text-white placeholder:text-slate-400 rtl:pl-4 rtl:pr-12" />
          </div>
          {errors.password && <p className="text-red-500 text-xs mt-1.5">{errors.password.message}</p>}
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{t('confirmPassword')}</label>
          <div className="relative mt-2">
            <Lock size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 rtl:left-auto rtl:right-4" />
            <input {...register('confirmPassword')} type="password"
              className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:outline-none transition text-slate-900 dark:text-white placeholder:text-slate-400 rtl:pl-4 rtl:pr-12" />
          </div>
          {errors.confirmPassword && <p className="text-red-500 text-xs mt-1.5">{errors.confirmPassword.message}</p>}
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <motion.button
          whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.97 }}
          type="submit" disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 to-purple-800 shadow-[0_10px_30px_rgba(147,51,234,0.3)] hover:shadow-[0_10px_40px_rgba(147,51,234,0.5)] transition-shadow disabled:opacity-50"
        >
          {t('submit')}
          <ArrowRight size={18} className="rtl:rotate-180" />
        </motion.button>
      </form>

      <Link href="/login" className="mt-8 flex items-center justify-center gap-1.5 text-sm font-semibold text-purple-600 dark:text-purple-400 hover:underline">
        <ArrowLeft size={14} className="rtl:rotate-180" />
        {tf('backToLogin')}
      </Link>
    </>
  );
}