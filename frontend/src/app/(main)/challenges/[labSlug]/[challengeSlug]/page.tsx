'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft, Lock, Loader2, Zap, Flag, Crown, Sparkles, RotateCcw, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { ChallengeDetail, LabDetail, Submission } from '@/types';
import { useExtra } from '@/i18n/extra';
import { useChallengeChatLifecycle } from '@/hooks/useChallengeChatLifecycle';
import CodeEditor from '@/components/editor/CodeEditor';
import OutputPanel from '@/components/editor/OutputPanel';
import HintPanel from '@/components/challenge/HintPanel';
import SchemaViewer from '@/components/challenge/SchemaViewer';
import LiveSampleDataViewer from '@/components/challenge/LiveSampleDataViewer';
import ReportChallengeModal from '@/components/challenge/ReportChallengeModal';
import { AuraFrame, EmberField } from '@/components/challenge/BossAura';

const POLL_INTERVAL_MS = 600;
const MAX_POLL_ATTEMPTS = 50;
const REQUEST_TIMEOUT_MS = 10000;
const PASTE_FLAG_MIN_LENGTH = 20;
const DRAFT_SAVE_DELAY_MS = 400;

const draftKey = (userId: string | undefined, slug: string) => `urlap:draft:${userId ?? 'anon'}:${slug}`;

export default function ChallengeSolvePage() {
  const { labSlug, challengeSlug } = useParams<{ labSlug: string; challengeSlug: string }>();
  const t = useTranslations('challenge');
  const x = useExtra();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const { data: challenge, isError } = useQuery<ChallengeDetail>({
    queryKey: ['challenge', challengeSlug],
    queryFn: async () => (await api.get(`/challenges/${challengeSlug}`)).data,
  });
  const { data: lab } = useQuery<LabDetail>({
    queryKey: ['lab', labSlug],
    queryFn: async () => (await api.get(`/challenges/labs/${labSlug}`)).data,
  });

  const [code, setCode] = useState('');
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [running, setRunning] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);

  const cancelRef = useRef({ cancelled: false });
  const currentIdRef = useRef<string | undefined>(undefined);
  currentIdRef.current = challenge?.id;
  const starterRef = useRef('');
  const pasteDetectedRef = useRef(false);
  const tabSwitchCountRef = useRef(0);
  const startTimeRef = useRef(Date.now());

  const key = draftKey(user?.id, challengeSlug);

  useChallengeChatLifecycle(challenge?.id);

  useEffect(() => {
    cancelRef.current.cancelled = false;
    return () => { cancelRef.current.cancelled = true; };
  }, []);

  // Load the challenge: restore this student's saved draft if there is one, otherwise the starter code.
  useEffect(() => {
    if (!challenge) return;
    const starter = challenge.starterCodes[0]?.code ?? '-- write your SQL query here\n';
    starterRef.current = starter;

    let draft: string | null = null;
    try { draft = localStorage.getItem(key); } catch { /* storage unavailable */ }
    if (draft && draft.trim() && draft !== starter) {
      setCode(draft);
      setHasDraft(true);
      toast.info(x('draftRestored'));
    } else {
      setCode(starter);
      setHasDraft(false);
    }

    setSubmission(null);
    setRunning(false);
    pasteDetectedRef.current = false;
    tabSwitchCountRef.current = 0;
    startTimeRef.current = Date.now();
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challenge?.id, user?.id]);

  // Auto-save (debounced). Nothing is written until the draft has been restored, so it can't be overwritten by the starter.
  useEffect(() => {
    if (!hydrated) return;
    const id = setTimeout(() => {
      try {
        if (code === starterRef.current || !code.trim()) { localStorage.removeItem(key); setHasDraft(false); }
        else { localStorage.setItem(key, code); setHasDraft(true); }
      } catch { /* storage full or unavailable */ }
    }, DRAFT_SAVE_DELAY_MS);
    return () => clearTimeout(id);
  }, [code, hydrated, key]);

  useEffect(() => {
    function handleVisibility() { if (document.hidden) tabSwitchCountRef.current += 1; }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  function handlePaste(pastedLength: number) {
    if (pastedLength > PASTE_FLAG_MIN_LENGTH) pasteDetectedRef.current = true;
  }

  function resetCode() {
    if (!confirm(x('resetConfirm'))) return;
    try { localStorage.removeItem(key); } catch { /* ignore */ }
    setCode(starterRef.current);
    setHasDraft(false);
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

    const isPasted = pasteDetectedRef.current;
    const timeSpentSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
    const tabSwitches = tabSwitchCountRef.current;
    pasteDetectedRef.current = false;
    tabSwitchCountRef.current = 0;
    startTimeRef.current = Date.now();

    try {
      const { data } = await api.post('/submissions', { challengeId: challenge.id, language: 'SQL', code, isPasted, timeSpentSeconds, tabSwitches }, { timeout: REQUEST_TIMEOUT_MS });
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

  const isMaster = !!challenge.isBoss;
  const ordered = lab ? [...lab.challenges].sort((a, b) => a.orderIndex - b.orderIndex) : [];
  const idx = ordered.findIndex((c) => c.slug === challengeSlug);
  const next = idx >= 0 ? ordered[idx + 1] : undefined;
  const nextHref = submission?.status === 'ACCEPTED' && next && !next.locked ? `/challenges/${labSlug}/${next.slug}` : undefined;

  const title = locale === 'ar' ? challenge.titleAr : challenge.titleEn;
  const description = locale === 'ar' ? challenge.descriptionAr : challenge.descriptionEn;
  const difficultyLabel =
    challenge.difficulty === 'EASY' ? t('difficultyEasy')
    : challenge.difficulty === 'MEDIUM' ? t('difficultyMedium')
    : challenge.difficulty === 'HARD' ? t('difficultyHard')
    : t('difficultyExpert');

  const conquered = isMaster && submission?.status === 'ACCEPTED' && submission.pointsAwarded > 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-10">
      {isMaster && (
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(217,154,168,0.12),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(165,151,220,0.10),transparent_55%)]" />
      )}

      <Link href={`/challenges/${labSlug}`} className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-purple-600 dark:text-slate-400 dark:hover:text-purple-400 md:mb-6">
        <ArrowLeft size={16} className="rtl:rotate-180" />
        {t('backToLab')}
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          {isMaster ? (
            <AuraFrame className="mb-6">
              <div className="relative bg-gradient-to-br from-slate-900 via-[#1d1722] to-slate-900 p-5 sm:p-7">
                <EmberField count={8} />
                <div className="relative z-10">
                  <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-amber-200/30 bg-amber-200/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-amber-200">
                    <Crown size={12} /> {x('bossLabel')}
                  </span>
                  <h1 className="mb-3 bg-gradient-to-r from-amber-100 via-rose-200 to-violet-200 bg-clip-text text-2xl font-black text-transparent sm:text-3xl">{title}</h1>
                  <div className="mb-5 flex items-center gap-3">
                    <span className="flex items-center gap-1 rounded-full bg-rose-300/10 px-3 py-1 text-xs font-bold text-rose-200"><Sparkles size={12} />{difficultyLabel}</span>
                    <span className="text-sm font-bold text-amber-200">{challenge.points} {t('pts')}</span>
                  </div>
                  <p className="whitespace-pre-line leading-relaxed text-slate-200">{description}</p>
                </div>
              </div>
            </AuraFrame>
          ) : (
            <div className="glass mb-6 rounded-3xl p-5 sm:p-7">
              <h1 className="mb-3 text-xl font-extrabold text-slate-900 dark:text-white sm:text-2xl">{title}</h1>
              <div className="mb-5 flex items-center gap-3">
                <span className="rounded-full bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-700 dark:text-purple-400">{difficultyLabel}</span>
                <span className="text-sm font-bold text-slate-500 dark:text-slate-400">{challenge.points} {t('pts')}</span>
              </div>
              <p className="whitespace-pre-line leading-relaxed text-slate-700 dark:text-slate-300">{description}</p>
            </div>
          )}

          <SchemaViewer schemaJson={challenge.schemaJson} />
          <LiveSampleDataViewer challengeSlug={challengeSlug} />
          <HintPanel hints={challenge.hints} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setReportOpen(true)} className="flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500 hover:border-amber-400 hover:text-amber-600 dark:border-slate-700/50 dark:text-slate-400">
                <Flag size={13} />
                {t('report')}
              </button>
              {hasDraft && (
                <button onClick={resetCode} title={x('resetConfirm')} className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-slate-400 hover:text-purple-500 dark:text-slate-500">
                  <RotateCcw size={12} />
                  {x('resetCode')}
                </button>
              )}
            </div>
            <button
              onClick={handleSubmit}
              disabled={running}
              className={`flex items-center gap-2 rounded-full px-6 py-2.5 font-semibold text-white transition-all duration-300 hover:-translate-y-1 disabled:opacity-60 disabled:hover:translate-y-0 ${isMaster ? 'bg-gradient-to-r from-rose-500 to-amber-500 shadow-[0_0_20px_rgba(244,114,182,0.28)]' : 'bg-gradient-to-r from-purple-600 to-purple-800 shadow-[0_0_18px_rgba(147,51,234,0.3)]'}`}
            >
              {running ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
              {running ? t('checking') : t('submitQuery')}
            </button>
          </div>

          <div className={isMaster ? 'rounded-2xl shadow-[0_0_40px_-10px_rgba(217,154,168,0.35)] ring-1 ring-rose-300/25' : ''}>
            <CodeEditor value={code} onChange={setCode} language="SQL" onPaste={handlePaste} />
          </div>
          {hasDraft && (
            <div className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500"><Check size={11} /> {x('draftSaved')}</div>
          )}

          {conquered && (
            <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 16 }}
              className="relative mt-4 overflow-hidden rounded-2xl border border-amber-200/30 bg-gradient-to-r from-amber-200/10 via-rose-200/10 to-violet-200/10 p-5 text-center">
              <Crown size={26} className="mx-auto mb-2 text-amber-300" />
              <div className="bg-gradient-to-r from-amber-200 via-rose-300 to-violet-300 bg-clip-text text-lg font-black text-transparent">{x('bossVictory')}</div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{x('bossVictoryBody')}</p>
            </motion.div>
          )}

          <OutputPanel submission={submission} running={running} nextHref={nextHref} />
        </motion.div>
      </div>

      <ReportChallengeModal challengeId={challenge.id} open={reportOpen} onClose={() => setReportOpen(false)} />
    </div>
  );
}