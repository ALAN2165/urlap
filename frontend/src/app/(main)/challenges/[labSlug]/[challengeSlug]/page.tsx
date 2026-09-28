'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft, Lock, Loader2, Zap } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { ChallengeDetail, LabDetail, Submission } from '@/types';
import CodeEditor from '@/components/editor/CodeEditor';
import OutputPanel from '@/components/editor/OutputPanel';
import HintPanel from '@/components/challenge/HintPanel';
import SchemaViewer from '@/components/challenge/SchemaViewer';

const POLL_INTERVAL_MS = 600;
const MAX_POLL_ATTEMPTS = 50; // ~30 seconds, then we stop waiting
const REQUEST_TIMEOUT_MS = 10000;

export default function ChallengeSolvePage() {
  const { labSlug, challengeSlug } = useParams<{ labSlug: string; challengeSlug: string }>();
  const t = useTranslations('challenge');
  const locale = useLocale();
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);

  const { data: challenge, isError } = useQuery<ChallengeDetail>({
    queryKey: ['challenge', challengeSlug],
    queryFn: async () => (await api.get(`/challenges/${challengeSlug}`)).data,
  });

  // Same key the lab page uses, so invalidating ['lab'] refreshes this too.
  const { data: lab } = useQuery<LabDetail>({
    queryKey: ['lab', labSlug],
    queryFn: async () => (await api.get(`/challenges/labs/${labSlug}`)).data,
  });

  const [code, setCode] = useState('');
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [running, setRunning] = useState(false);

  const cancelRef = useRef({ cancelled: false });
  const currentIdRef = useRef<string | undefined>(undefined);
  currentIdRef.current = challenge?.id;

  useEffect(() => {
    cancelRef.current.cancelled = false;
    return () => { cancelRef.current.cancelled = true; };
  }, []);

  // The route component is reused when moving to the next challenge, so reset per challenge.
  useEffect(() => {
    if (!challenge) return;
    setCode(challenge.starterCodes[0]?.code ?? '-- write your SQL query here\n');
    setSubmission(null);
    setRunning(false);
  }, [challenge?.id]);

  async function pollUntilDone(id: string): Promise<Submission | null> {
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      if (cancelRef.current.cancelled) return null;
      const { data } = await api.get<Submission>(`/submissions/${id}`, { timeout: REQUEST_TIMEOUT_MS });
      if (data.status !== 'PENDING' && data.status !== 'RUNNING') return data;
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
    return null;
  }

  async function refreshProgress() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['lab'] }),   // unlocks the next challenge
      queryClient.invalidateQueries({ queryKey: ['labs'] }),  // lab progress bars / dashboard
      queryClient.invalidateQueries({ queryKey: ['stats'] }), // points, rank
    ]);
    try {
      const { data } = await api.get('/auth/me', { timeout: REQUEST_TIMEOUT_MS });
      setUser(data);
    } catch {
      /* non-critical */
    }
  }

  async function handleSubmit() {
    if (!challenge || running) return;
    const startedFor = challenge.id;
    setRunning(true);
    setSubmission(null);

    try {
      const { data } = await api.post(
        '/submissions',
        { challengeId: challenge.id, language: 'SQL', code },
        { timeout: REQUEST_TIMEOUT_MS }
      );
      const finished = await pollUntilDone(data.submissionId);

      if (cancelRef.current.cancelled || currentIdRef.current !== startedFor) return;

      if (!finished) {
        setSubmission({ id: 'timeout', status: 'TIME_LIMIT_EXCEEDED', errorMessage: t('gradingTimeout'), pointsAwarded: 0 });
        return;
      }

      setSubmission(finished);
      if (finished.status === 'ACCEPTED') void refreshProgress();
    } catch (err: any) {
      if (cancelRef.current.cancelled || currentIdRef.current !== startedFor) return;
      setSubmission({
        id: 'error',
        status: 'RUNTIME_ERROR',
        errorMessage: err?.response?.data?.error || err?.message || t('submitFailed'),
        pointsAwarded: 0,
      });
    } finally {
      setRunning(false);
    }
  }

  if (isError) return <div className="mx-auto max-w-7xl px-6 py-12 text-red-600 dark:text-red-400">{t('loadFailed')}</div>;
  if (!challenge) return <div className="mx-auto max-w-7xl px-6 py-12 text-slate-500 dark:text-slate-400">{t('loading')}</div>;

  if (challenge.locked) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <Lock size={40} className="mx-auto mb-4 text-slate-400 dark:text-slate-500" />
        <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">{t('locked')}</h1>
        <p className="mb-6 text-slate-600 dark:text-slate-400">{t('lockedDesc')}</p>
        <Link href={`/challenges/${labSlug}`} className="text-teal-600 hover:underline dark:text-teal-400">{t('backToLab')}</Link>
      </div>
    );
  }

  const idx = lab ? lab.challenges.findIndex((c) => c.slug === challengeSlug) : -1;
  const next = idx >= 0 ? lab?.challenges[idx + 1] : undefined;
  const nextHref =
    submission?.status === 'ACCEPTED' && next && !next.locked ? `/challenges/${labSlug}/${next.slug}` : undefined;

  const title = locale === 'ar' ? challenge.titleAr : challenge.titleEn;
  const description = locale === 'ar' ? challenge.descriptionAr : challenge.descriptionEn;
  const difficultyLabel =
    challenge.difficulty === 'EASY' ? t('difficultyEasy')
    : challenge.difficulty === 'MEDIUM' ? t('difficultyMedium')
    : challenge.difficulty === 'HARD' ? t('difficultyHard')
    : t('difficultyExpert');

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <Link href={`/challenges/${labSlug}`} className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400">
        <ArrowLeft size={16} className="rtl:rotate-180" />
        {t('backToLab')}
      </Link>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="glass mb-6 rounded-3xl p-7">
            <h1 className="mb-3 text-2xl font-extrabold text-slate-900 dark:text-white">{title}</h1>
            <div className="mb-5 flex items-center gap-3">
              <span className="rounded-full border border-teal-500/20 bg-teal-500/10 px-3 py-1 text-xs font-bold text-teal-700 dark:text-teal-400">
                {difficultyLabel}
              </span>
              <span className="bg-gradient-to-r from-teal-500 to-purple-600 bg-clip-text text-sm font-bold text-transparent">
                {challenge.points} {t('pts')}
              </span>
            </div>
            <p className="whitespace-pre-line leading-relaxed text-slate-700 dark:text-slate-300">{description}</p>
          </div>

          <SchemaViewer schemaJson={challenge.schemaJson} />
          <HintPanel hints={challenge.hints} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}>
          <div className="mb-3 flex items-center justify-end">
            <button
              onClick={handleSubmit}
              disabled={running}
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-teal-500 to-purple-600 px-6 py-2.5 font-semibold text-white shadow-[0_0_20px_rgba(20,184,166,0.3)] transition-all duration-300 hover:-translate-y-1 disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {running ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
              {running ? t('checking') : t('submitQuery')}
            </button>
          </div>
          <CodeEditor value={code} onChange={setCode} language="SQL" />
          <OutputPanel submission={submission} running={running} nextHref={nextHref} />
        </motion.div>
      </div>
    </div>
  );
}