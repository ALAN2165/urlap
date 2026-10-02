'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X, Save, Trash2, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Announcement, AnnouncementType } from '@/types';

interface Props {
  announcement: Announcement | null;
  onClose: () => void;
}

const TYPES: AnnouncementType[] = ['INFO', 'NEW_LAB', 'FEATURE', 'MAINTENANCE'];

export default function AnnouncementEditorPanel({ announcement, onClose }: Props) {
  const queryClient = useQueryClient();
  const isEdit = !!announcement;

  const [titleEn, setTitleEn] = useState(announcement?.titleEn ?? '');
  const [titleAr, setTitleAr] = useState(announcement?.titleAr ?? '');
  const [contentEn, setContentEn] = useState(announcement?.contentEn ?? '');
  const [contentAr, setContentAr] = useState(announcement?.contentAr ?? '');
  const [type, setType] = useState<AnnouncementType>(announcement?.type ?? 'INFO');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    if (!titleEn.trim() || !titleAr.trim() || !contentEn.trim() || !contentAr.trim()) {
      toast.error('All title and content fields are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = { titleEn, titleAr, contentEn, contentAr, type };
      if (isEdit) {
        await api.put(`/admin/announcements/${announcement!.id}`, payload);
      } else {
        await api.post('/admin/announcements', payload);
      }
      await queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      await queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success(isEdit ? 'Announcement updated.' : 'Announcement published.');
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Could not save the announcement.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!announcement) return;
    if (!confirm('Delete this announcement permanently?')) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/announcements/${announcement.id}`);
      await queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      await queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Announcement deleted.');
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Could not delete the announcement.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-50 bg-black/50" />
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-700/50">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">{isEdit ? 'Edit Announcement' : 'New Announcement'}</h2>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as AnnouncementType)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white">
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

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

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Content (English)</label>
            <textarea rows={4} value={contentEn} onChange={(e) => setContentEn(e.target.value)} className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Content (Arabic)</label>
            <textarea dir="rtl" rows={4} value={contentAr} onChange={(e) => setContentAr(e.target.value)} className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white" />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 dark:border-slate-700/50">
          {isEdit ? (
            <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-1.5 text-sm font-semibold text-red-500 hover:text-red-600 disabled:opacity-50">
              {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Delete
            </button>
          ) : <span />}
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-purple-800 px-6 py-2.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(147,51,234,0.3)] disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isEdit ? 'Save changes' : 'Publish'}
          </button>
        </div>
      </motion.div>
    </>
  );
}