'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { User as UserIcon, Lock, Save, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import AvatarCircle from '@/components/shared/AvatarCircle';
import Switch from '@/components/shared/Switch';

const schema = z.object({
  username: z.string().min(3).max(20),
  password: z.string().min(8).optional().or(z.literal('')),
});
type FormData = z.infer<typeof schema>;

export default function ProfilePage() {
  const t = useTranslations('profile');
  const { user, setUser } = useAuthStore();
  const [error, setError] = useState('');
  const [togglingBoard, setTogglingBoard] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { username: user?.username ?? '', password: '' },
  });

  useEffect(() => {
    if (user) reset({ username: user.username, password: '' });
  }, [user, reset]);

  if (!user) return null;

  async function onSubmit(data: FormData) {
    setError('');
    try {
      const payload: Record<string, unknown> = {};
      if (data.username !== user!.username) payload.username = data.username;
      if (data.password) payload.password = data.password;

      if (Object.keys(payload).length === 0) {
        toast.info(t('nothingToUpdate'));
        return;
      }

      const { data: updated } = await api.put('/auth/profile', payload);
      setUser(updated);
      reset({ username: updated.username, password: '' });
      toast.success(t('saved'));
    } catch (err: any) {
      const msg = err?.response?.data?.error || t('updateFailed');
      setError(msg);
      toast.error(msg);
    }
  }

  async function onToggleLeaderboard(checked: boolean) {
    setTogglingBoard(true);
    try {
      const { data: updated } = await api.put('/auth/profile', { showInLeaderboard: checked });
      setUser(updated);
      toast.success(t('saved'));
    } catch (err: any) {
      toast.error(err?.response?.data?.error || t('updateFailed'));
    } finally {
      setTogglingBoard(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-8 flex items-center gap-5">
        <AvatarCircle name={user.username} size={76} fontSize={30} />
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">{t('subtitle')}</p>
        </div>
      </motion.div>

      <motion.form onSubmit={handleSubmit(onSubmit)} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
        className="glass mb-6 space-y-5 rounded-3xl p-8">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('displayName')}</label>
          <div className="relative mt-2">
            <UserIcon size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 rtl:left-auto rtl:right-4" />
            <input {...register('username')}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pl-11 text-slate-900 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-400 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white rtl:pl-4 rtl:pr-11" />
          </div>
          {errors.username && <p className="mt-1.5 text-xs text-red-500">{errors.username.message}</p>}
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('newPassword')}</label>
          <div className="relative mt-2">
            <Lock size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 rtl:left-auto rtl:right-4" />
            <input {...register('password')} type="password" placeholder={t('newPasswordPlaceholder')}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pl-11 text-slate-900 placeholder:text-slate-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-400 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white rtl:pl-4 rtl:pr-11" />
          </div>
          {errors.password && <p className="mt-1.5 text-xs text-red-500">{errors.password.message}</p>}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <motion.button whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.97 }} type="submit" disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-purple-600 py-3.5 font-bold text-white shadow-[0_10px_30px_rgba(20,184,166,0.3)] transition-shadow hover:shadow-[0_10px_40px_rgba(20,184,166,0.5)] disabled:opacity-50">
          {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {t('saveChanges')}
        </motion.button>
      </motion.form>

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
        className="glass flex items-center justify-between gap-4 rounded-3xl p-6">
        <div>
          <div className="font-semibold text-slate-900 dark:text-white">{t('leaderboardToggleTitle')}</div>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{t('leaderboardToggleDesc')}</p>
        </div>
        <Switch checked={user.showInLeaderboard ?? true} onChange={onToggleLeaderboard} disabled={togglingBoard} />
      </motion.div>
    </div>
  );
}