'use client';

import { useEffect, useState } from 'react';
import { Reorder, motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X, Save, Loader2, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { api } from '@/lib/api';
import { AdminLab } from '@/types/admin';

export default function LabReorderPanel({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: labs, isLoading } = useQuery<AdminLab[]>({
    queryKey: ['admin-labs'],
    queryFn: async () => (await api.get('/admin/labs')).data,
  });

  const [order, setOrder] = useState<AdminLab[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (labs) setOrder(labs); }, [labs]);

  const dirty = !!labs && order.some((l, i) => l.id !== labs[i]?.id);

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= order.length) return;
    const next = order.slice();
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
  }

  async function save() {
    setSaving(true);
    try {
      await api.put('/admin/labs/reorder', { labIds: order.map((l) => l.id) });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-labs'] }),
        queryClient.invalidateQueries({ queryKey: ['labs'] }), // student-facing lab list
        queryClient.invalidateQueries({ queryKey: ['lab'] }),
      ]);
      toast.success('Lab order updated everywhere.');
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Could not save the new order.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-50 bg-black/50" />
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-700/50">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Reorder labs</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Drag a lab, or use the arrows. The first lab is shown first to students.</p>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isLoading && <p className="text-sm text-slate-400">Loading…</p>}
          <Reorder.Group axis="y" values={order} onReorder={setOrder} className="space-y-2">
            {order.map((lab, i) => (
              <Reorder.Item key={lab.id} value={lab} whileDrag={{ scale: 1.03, boxShadow: '0 12px 40px rgba(147,51,234,0.35)' }}
                className="glass flex cursor-grab items-center gap-3 rounded-xl p-3 active:cursor-grabbing">
                <GripVertical size={16} className="flex-shrink-0 text-slate-400" />
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-purple-500/10 font-mono text-xs font-bold text-purple-600 dark:text-purple-300">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{lab.titleEn}</span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">{lab.challenges.length} challenge{lab.challenges.length !== 1 ? 's' : ''}</span>
                </span>
                <span className="flex flex-col">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="text-slate-400 hover:text-purple-500 disabled:opacity-20"><ChevronUp size={15} /></button>
                  <button onClick={() => move(i, 1)} disabled={i === order.length - 1} className="text-slate-400 hover:text-purple-500 disabled:opacity-20"><ChevronDown size={15} /></button>
                </span>
              </Reorder.Item>
            ))}
          </Reorder.Group>
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">Lab titles such as "Lab 4: …" are plain text: rename a lab from its pencil icon if its number should change.</p>
        </div>

        <div className="flex items-center justify-end border-t border-slate-200 px-6 py-4 dark:border-slate-700/50">
          <button onClick={save} disabled={!dirty || saving}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-purple-800 px-6 py-2.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(147,51,234,0.3)] disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save order
          </button>
        </div>
      </motion.div>
    </>
  );
}