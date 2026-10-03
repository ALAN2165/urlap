'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Plus, Pencil, ChevronUp, ChevronDown, FolderPlus } from 'lucide-react';
import { api } from '@/lib/api';
import { AdminLab } from '@/types/admin';
import ChallengeEditorPanel from '@/components/admin/challenges/ChallengeEditorPanel';

const DIFFICULTY_DOT: Record<string, string> = {
  EASY: 'bg-emerald-500', MEDIUM: 'bg-amber-500', HARD: 'bg-orange-500', EXPERT: 'bg-purple-500',
};

export default function AdminChallengesPage() {
  const queryClient = useQueryClient();
  const { data: labs, isLoading } = useQuery<AdminLab[]>({
    queryKey: ['admin-labs'],
    queryFn: async () => (await api.get('/admin/labs')).data,
  });

  const [activeLabId, setActiveLabId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ labId: string; challengeId: string | null } | null>(null);

  const [formMode, setFormMode] = useState<'closed' | 'new' | 'edit'>('closed');
  const [formLabId, setFormLabId] = useState<string | null>(null);
  const [formEn, setFormEn] = useState('');
  const [formAr, setFormAr] = useState('');
  const [savingLab, setSavingLab] = useState(false);

  const activeLab = labs?.find((l) => l.id === activeLabId) ?? labs?.[0];

  async function reorder(labId: string, challengeIds: string[]) {
    try {
      await api.put(`/admin/labs/${labId}/reorder`, { challengeIds });
      queryClient.invalidateQueries({ queryKey: ['admin-labs'] });
    } catch {
      toast.error('Could not reorder challenges.');
    }
  }

  function moveChallenge(labId: string, index: number, direction: -1 | 1) {
    const lab = labs?.find((l) => l.id === labId);
    if (!lab) return;
    const ids = lab.challenges.map((c) => c.id);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorder(labId, ids);
  }

  function openNewLabForm() {
    setFormMode('new');
    setFormLabId(null);
    setFormEn('');
    setFormAr('');
  }

  function openEditLabForm(lab: AdminLab) {
    setFormMode('edit');
    setFormLabId(lab.id);
    setFormEn(lab.titleEn);
    setFormAr(lab.titleAr);
  }

  async function saveLabForm() {
    if (!formEn.trim() || !formAr.trim()) return;
    setSavingLab(true);
    try {
      if (formMode === 'edit' && formLabId) {
        await api.put(`/admin/labs/${formLabId}`, { titleEn: formEn, titleAr: formAr });
        toast.success('Lab updated.');
      } else {
        const { data } = await api.post('/admin/labs', { titleEn: formEn, titleAr: formAr });
        setActiveLabId(data.id);
        toast.success('Lab created.');
      }
      await queryClient.invalidateQueries({ queryKey: ['admin-labs'] });
      setFormMode('closed');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Could not save the lab.');
    } finally {
      setSavingLab(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-1">
        {labs?.map((lab) => (
          <button
            key={lab.id}
            onClick={() => setActiveLabId(lab.id)}
            className={`flex-shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              lab.id === (activeLab?.id ?? labs[0]?.id)
                ? 'bg-gradient-to-r from-purple-600 to-purple-800 text-white shadow-[0_0_14px_rgba(147,51,234,0.3)]'
                : 'glass text-slate-600 dark:text-slate-300'
            }`}
          >
            {lab.titleEn}
            <span className="ml-1.5 opacity-70">({lab.challenges.length})</span>
          </button>
        ))}
        <button
          onClick={openNewLabForm}
          className="flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-dashed border-slate-300 px-4 py-2 text-sm font-semibold text-slate-500 hover:border-purple-400 hover:text-purple-500 dark:border-slate-700"
        >
          <FolderPlus size={14} />
          New lab
        </button>
      </div>

      <AnimatePresence>
        {formMode !== 'closed' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-6 overflow-hidden">
            <div className="glass flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Title (English)</label>
                <input value={formEn} onChange={(e) => setFormEn(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white" />
              </div>
              <div className="flex-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Title (Arabic)</label>
                <input dir="rtl" value={formAr} onChange={(e) => setFormAr(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white" />
              </div>
              <div className="flex gap-2">
                <button onClick={saveLabForm} disabled={savingLab} className="rounded-lg bg-gradient-to-r from-purple-600 to-purple-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                  {formMode === 'edit' ? 'Save' : 'Create'}
                </button>
                <button onClick={() => setFormMode('closed')} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-500">Cancel</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading && <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>}

      {activeLab && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {activeLab.challenges.length} challenge{activeLab.challenges.length !== 1 ? 's' : ''}
              </h2>
              <button
                onClick={() => openEditLabForm(activeLab)}
                className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:bg-purple-500/10 hover:text-purple-500"
                title="Edit lab name"
              >
                <Pencil size={12} />
              </button>
            </div>
            <button
              onClick={() => setEditing({ labId: activeLab.id, challengeId: null })}
              className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-600 to-purple-800 px-4 py-2 text-xs font-bold text-white shadow-[0_0_14px_rgba(147,51,234,0.3)]"
            >
              <Plus size={14} />
              New Challenge
            </button>
          </div>

          <div className="space-y-2">
            {activeLab.challenges.map((c, i) => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass flex items-center gap-3 rounded-xl p-3.5">
                <div className="flex flex-col">
                  <button onClick={() => moveChallenge(activeLab.id, i, -1)} disabled={i === 0} className="text-slate-400 hover:text-purple-500 disabled:opacity-20">
                    <ChevronUp size={14} />
                  </button>
                  <button onClick={() => moveChallenge(activeLab.id, i, 1)} disabled={i === activeLab.challenges.length - 1} className="text-slate-400 hover:text-purple-500 disabled:opacity-20">
                    <ChevronDown size={14} />
                  </button>
                </div>
                <span className={`h-2 w-2 flex-shrink-0 rounded-full ${DIFFICULTY_DOT[c.difficulty]}`} />
                <span className="flex-1 truncate text-sm font-semibold text-slate-900 dark:text-white">{c.titleEn}</span>
                <span className="flex-shrink-0 text-xs font-bold text-purple-500 dark:text-purple-400">{c.points} pts</span>
                <button
                  onClick={() => setEditing({ labId: activeLab.id, challengeId: c.id })}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-purple-500/10 hover:text-purple-500"
                >
                  <Pencil size={14} />
                </button>
              </motion.div>
            ))}
            {activeLab.challenges.length === 0 && (
              <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">No challenges in this lab yet.</p>
            )}
          </div>
        </>
      )}

      <AnimatePresence>
        {editing && <ChallengeEditorPanel labId={editing.labId} challengeId={editing.challengeId} onClose={() => setEditing(null)} />}
      </AnimatePresence>
    </div>
  );
}