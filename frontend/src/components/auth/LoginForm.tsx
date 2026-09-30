'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import LogoOrb from '@/components/shared/LogoOrb';

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });
type FormData = z.infer<typeof schema>;

export default function LoginForm() {
  const t = useTranslations('auth');
  const { login } = useAuth();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setError('');
    try {
      await login(data.email, data.password);
    } catch (err: any) {
      setError(err?.response?.data?.error || t('loginFailed'));
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }} className="w-full max-w-md p-6 rounded-3xl glass sm:p-10">
      <div className="flex justify-center mb-6 lg:hidden">
        <LogoOrb size={100} imgSize={52} />
      </div>

      <h1 className="text-2xl font-bold mb-1 sm:text-3xl">{t('loginTitle')}</h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-7 sm:mb-8">{t('subtitleLogin')}</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{t('email')}</label>
          <div className="relative mt-2">
            <Mail size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 rtl:left-auto rtl:right-4" />
            <input {...register('email')} type="email"
              className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:outline-none transition text-slate-900 dark:text-white placeholder:text-slate-400 rtl:pl-4 rtl:pr-12" />
          </div>
          {errors.email && <p className="text-red-500 text-xs mt-1.5">{errors.email.message}</p>}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{t('password')}</label>
          <div className="relative mt-2">
            <Lock size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 rtl:left-auto rtl:right-4" />
            <input {...register('password')} type="password"
              className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:outline-none transition text-slate-900 dark:text-white placeholder:text-slate-400 rtl:pl-4 rtl:pr-12" />
          </div>
          {errors.password && <p className="text-red-500 text-xs mt-1.5">{errors.password.message}</p>}
        </motion.div>

        {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-500 text-sm">{error}</motion.p>}

        <motion.button
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}
          whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.97 }}
          type="submit" disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 to-purple-800 shadow-[0_10px_30px_rgba(147,51,234,0.3)] hover:shadow-[0_10px_40px_rgba(147,51,234,0.5)] transition-shadow disabled:opacity-50"
        >
          {t('submit')}
          <ArrowRight size={18} className="rtl:rotate-180" />
        </motion.button>
      </form>

      <p className="text-sm text-center mt-8 text-slate-500 dark:text-slate-400">
        {t('noAccount')} <Link href="/register" className="text-purple-600 dark:text-purple-400 font-semibold hover:underline">{t('register')}</Link>
      </p>
    </motion.div>
  );
}