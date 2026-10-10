'use client';
import { useChallengeChatLifecycle } from '@/hooks/useChallengeChatLifecycle';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft, Lock, Loader2, Zap, Flag } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { ChallengeDetail, LabDetail, Submission } from '@/types';
import CodeEditor from '@/components/editor/CodeEditor';
import OutputPanel from '@/components/editor/OutputPanel';
import HintPanel from '@/components/challenge/HintPanel';
import SchemaViewer from '@/components/challenge/SchemaViewer';
import ReportChallengeModal from '@/components/challenge/ReportChallengeModal';
import LiveSampleDataViewer from '@/components/challenge/LiveSampleDataViewer';

const POLL_INTERVAL_MS = 600;
const MAX_POLL_ATTEMPTS = 50;
const REQUEST_TIMEOUT_MS = 10000;
const PASTE_FLAG_MIN_LENGTH = 20; // ignore trivial pastes like a single word

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
  useChallengeChatLifecycle(challenge?.id);

  const { data: lab } = useQuery<LabDetail>({
    queryKey: ['lab', labSlug],
    queryFn: async () => (await api.get(`/challenges/labs/${labSlug}`)).data,
  });

  const [code, setCode] = useState('');
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [running, setRunning] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const cancelRef = useRef({ cancelled: false });
  const currentIdRef = useRef<string | undefined>(undefined);
  currentIdRef.current = challenge?.id;

  // Anti-cheating signal tracking — reset per challenge and per attempt.
  const pasteDetectedRef = useRef(false);
  const tabSwitchCountRef = useRef(0);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    cancelRef.current.cancelled = false;
    return () => { cancelRef.current.cancelled = true; };
  }, []);

  useEffect(() => {
    if (!challenge) return;
    setCode(challenge.starterCodes[0]?.code ?? '-- write your SQL query here\n');
    setSubmission(null);
    setRunning(false);
    pasteDetectedRef.current = false;
    tabSwitchCountRef.current = 0;
    startTimeRef.current = Date.now();
  }, [challenge?.id]);

  // Counts how many times the user left this tab while on the current
  // attempt — tracked purely for admin visibility, never used to block
  // or auto-penalize anything.
  useEffect(() => {
    function handleVisibility() {
      if (document.hidden) tabSwitchCountRef.current += 1;
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  function handlePaste(pastedLength: number) {
    if (pastedLength > PASTE_FLAG_MIN_LENGTH) pasteDetectedRef.current = true;
  }

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
      queryClient.invalidateQueries({ queryKey: ['lab'] }),
      queryClient.invalidateQueries({ queryKey: ['labs'] }),
      queryClient.invalidateQueries({ queryKey: ['stats'] }),
    ]);
    try {
      const { data } = await api.get('/auth/me', { timeout: REQUEST_TIMEOUT_MS });
      setUser(data);
    } catch { /* non-critical */ }
  }

  async function handleSubmit() {
    if (!challenge || running) return;
    const startedFor = challenge.id;
    setRunning(true);
    setSubmission(null);

    // Snapshot this attempt's anti-cheat signals, then reset immediately so
    // the NEXT attempt starts tracking fresh instead of accumulating.
    const isPasted = pasteDetectedRef.current;
    const timeSpentSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
    const tabSwitches = tabSwitchCountRef.current;
    pasteDetectedRef.current = false;
    tabSwitchCountRef.current = 0;
    startTimeRef.current = Date.now();

    try {
      const { data } = await api.post(
        '/submissions',
        { challengeId: challenge.id, language: 'SQL', code, isPasted, timeSpentSeconds, tabSwitches },
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
      setSubmission({ id: 'error', status: 'RUNTIME_ERROR', errorMessage: err?.response?.data?.error || err?.message || t('submitFailed'), pointsAwarded: 0 });
    } finally {
      setRunning(false);
    }
  }

  if (isError) return <div className="mx-auto max-w-7xl px-4 py-12 text-red-600 dark:text-red-400 sm:px-6">{t('loadFailed')}</div>;
  if (!challenge) return <div className="mx-auto max-w-7xl px-4 py-12 text-slate-500 dark:text-slate-400 sm:px-6">{t('loading')}</div>;

  if (challenge.locked) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 sm:py-24">
        <Lock size={40} className="mx-auto mb-4 text-slate-400 dark:text-slate-500" />
        <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">{t('locked')}</h1>
        <p className="mb-6 text-slate-600 dark:text-slate-400">{t('lockedDesc')}</p>
        <Link href={`/challenges/${labSlug}`} className="text-purple-600 hover:underline dark:text-purple-400">{t('backToLab')}</Link>
      </div>
    );
  }

  const idx = lab ? lab.challenges.findIndex((c) => c.slug === challengeSlug) : -1;
  const next = idx >= 0 ? lab?.challenges[idx + 1] : undefined;
  const nextHref = submission?.status === 'ACCEPTED' && next && !next.locked ? `/challenges/${labSlug}/${next.slug}` : undefined;

  const title = locale === 'ar' ? challenge.titleAr : challenge.titleEn;
  const description = locale === 'ar' ? challenge.descriptionAr : challenge.descriptionEn;
  const difficultyLabel =
    challenge.difficulty === 'EASY' ? t('difficultyEasy')
    : challenge.difficulty === 'MEDIUM' ? t('difficultyMedium')
    : challenge.difficulty === 'HARD' ? t('difficultyHard')
    : t('difficultyExpert');

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-10">
      <Link href={`/challenges/${labSlug}`} className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-purple-600 dark:text-slate-400 dark:hover:text-purple-400 md:mb-6">
        <ArrowLeft size={16} className="rtl:rotate-180" />
        {t('backToLab')}
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="glass mb-6 rounded-3xl p-5 sm:p-7">
            <h1 className="mb-3 text-xl font-extrabold text-slate-900 dark:text-white sm:text-2xl">{title}</h1>
            <div className="mb-5 flex items-center gap-3">
              <span className="rounded-full bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-700 dark:text-purple-400">{difficultyLabel}</span>
              <span className="text-sm font-bold text-slate-500 dark:text-slate-400">{challenge.points} {t('pts')}</span>
            </div>
            <p className="whitespace-pre-line leading-relaxed text-slate-700 dark:text-slate-300">{description}</p>
          </div>

         <SchemaViewer schemaJson={challenge.schemaJson} />
<LiveSampleDataViewer challengeSlug={challengeSlug} />
<HintPanel hints={challenge.hints} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <button
              onClick={() => setReportOpen(true)}
              className="flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500 hover:border-amber-400 hover:text-amber-600 dark:border-slate-700/50 dark:text-slate-400"
            >
              <Flag size={13} />
              {t('report')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={running}
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-purple-800 px-6 py-2.5 font-semibold text-white shadow-[0_0_18px_rgba(147,51,234,0.3)] transition-all duration-300 hover:-translate-y-1 disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {running ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
              {running ? t('checking') : t('submitQuery')}
            </button>
          </div>
          <CodeEditor value={code} onChange={setCode} language="SQL" onPaste={handlePaste} />
          <OutputPanel submission={submission} running={running} nextHref={nextHref} />
        </motion.div>
      </div>

      <ReportChallengeModal challengeId={challenge.id} open={reportOpen} onClose={() => setReportOpen(false)} />
    </div>
  );
}