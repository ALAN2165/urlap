'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X, Save, Trash2, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { AdminChallengeDetail, AdminHint } from '@/types/admin';
import SchemaBuilder from './SchemaBuilder';
import HintsEditor from './HintsEditor';
import SqlTester from './SqlTester';

interface Props {
  labId: string;
  challengeId: string | null;
  onClose: () => void;
}

const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD', 'EXPERT'] as const;

const EMPTY_HINTS: AdminHint[] = [
  { order: 1, contentEn: '', contentAr: '', pointPenalty: 10 },
  { order: 2, contentEn: '', contentAr: '', pointPenalty: 20 },
  { order: 3, contentEn: '', contentAr: '', pointPenalty: 30 },
];

export default function ChallengeEditorPanel({ labId, challengeId, onClose }: Props) {
  const queryClient = useQueryClient();
  const isEdit = !!challengeId;

  const { data: existing, isLoading } = useQuery<AdminChallengeDetail>({
    queryKey: ['admin-challenge', challengeId],
    queryFn: async () => (await api.get(`/admin/challenges/${challengeId}`)).data,
    enabled: isEdit,
  });

  const [titleEn, setTitleEn] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [descriptionAr, setDescriptionAr] = useState('');
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number]>('EASY');
  const [points, setPoints] = useState(100);
  const [schemaJson, setSchemaJson] = useState<string | null>(null);
  const [referenceAnswer, setReferenceAnswer] = useState('-- write the correct SQL for this challenge\n');
  const [hints, setHints] = useState<AdminHint[]>(EMPTY_HINTS);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (existing) {
      setTitleEn(existing.titleEn);
      setTitleAr(existing.titleAr);
      setDescriptionEn(existing.descriptionEn);
      setDescriptionAr(existing.descriptionAr);
      setDifficulty(existing.difficulty as any);
      setPoints(existing.points);
      setSchemaJson(existing.schemaJson);
      setReferenceAnswer(existing.referenceAnswer ?? '');
      setHints(existing.hints.length === 3 ? existing.hints : EMPTY_HINTS);
    }
  }, [existing]);

  async function handleSave() {
    if (!titleEn.trim() || !titleAr.trim() || !referenceAnswer.trim()) {
      toast.error('Title (EN/AR) and the reference answer are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        titleEn, titleAr, descriptionEn, descriptionAr, difficulty, points,
        schemaJson, referenceAnswer,
        hints: hints.map((h) => ({ contentEn: h.contentEn, contentAr: h.contentAr, pointPenalty: h.pointPenalty })),
      };
      if (isEdit) {
        await api.put(`/admin/challenges/${challengeId}`, payload);
      } else {
        await api.post('/admin/challenges', { ...payload, labId });
      }
      await queryClient.invalidateQueries({ queryKey: ['admin-labs'] });
      toast.success(isEdit ? 'Challenge updated.' : 'Challenge created.');
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Could not save the challenge.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!challengeId) return;
    if (!confirm('Delete this challenge permanently? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/challenges/${challengeId}`);
      await queryClient.invalidateQueries({ queryKey: ['admin-labs'] });
      toast.success('Challenge deleted.');
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Could not delete the challenge.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-50 bg-black/50" />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col bg-white shadow-2xl dark:bg-slate-900"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-700/50">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">{isEdit ? 'Edit Challenge' : 'New Challenge'}</h2>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>

        {isEdit && isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 size={24} className="animate-spin text-purple-400" />
          </div>
        ) : (
          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Title (English)</label>
                <input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Title (Arabic)</label>
                <input dir="rtl" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Description (English)</label>
                <textarea rows={3} value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Description (Arabic)</label>
                <textarea dir="rtl" rows={3} value={descriptionAr} onChange={(e) => setDescriptionAr(e.target.value)} className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Difficulty</label>
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as any)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white">
                  {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Points</label>
                <input type="number" min={0} value={points} onChange={(e) => setPoints(Number(e.target.value))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white" />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Schema (shown to students)</label>
              <SchemaBuilder value={schemaJson} onChange={setSchemaJson} />
            </div>

            <SqlTester value={referenceAnswer} onChange={setReferenceAnswer} />

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Hints (progressive, 3 required)</label>
              <HintsEditor hints={hints} onChange={setHints} />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 dark:border-slate-700/50">
          {isEdit ? (
            <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-1.5 text-sm font-semibold text-red-500 hover:text-red-600 disabled:opacity-50">
              {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Delete
            </button>
          ) : <span />}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-purple-800 px-6 py-2.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(147,51,234,0.3)] disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isEdit ? 'Save changes' : 'Create challenge'}
          </button>
        </div>
      </motion.div>
    </>
  );
}