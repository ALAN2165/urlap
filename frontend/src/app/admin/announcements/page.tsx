'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Rocket, Sparkles, Wrench, Info } from 'lucide-react';
import { api } from '@/lib/api';
import { Announcement, AnnouncementType } from '@/types';
import AnnouncementEditorPanel from '@/components/admin/announcements/AnnouncementEditorPanel';

const TYPE_META: Record<AnnouncementType, { Icon: typeof Info; className: string }> = {
  INFO: { Icon: Info, className: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20' },
  NEW_LAB: { Icon: Rocket, className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' },
  FEATURE: { Icon: Sparkles, className: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20' },
  MAINTENANCE: { Icon: Wrench, className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20' },
};

export default function AdminAnnouncementsPage() {
  const { data: announcements, isLoading } = useQuery<Announcement[]>({
    queryKey: ['admin-announcements'],
    queryFn: async () => (await api.get('/admin/announcements')).data,
  });

  const [editing, setEditing] = useState<{ announcement: Announcement | null } | null>(null);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300">
          {announcements?.length ?? 0} announcement{announcements?.length !== 1 ? 's' : ''}
        </h2>
        <button
          onClick={() => setEditing({ announcement: null })}
          className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-600 to-purple-800 px-4 py-2 text-xs font-bold text-white shadow-[0_0_14px_rgba(147,51,234,0.3)]"
        >
          <Plus size={14} />
          New Announcement
        </button>
      </div>

      {isLoading && <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>}

      <div className="space-y-3">
        {announcements?.map((a) => {
          const { Icon, className } = TYPE_META[a.type];
          const date = new Date(a.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
          return (
            <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-4 sm:p-5">
              <div className="mb-2 flex items-center justify-between">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${className}`}>
                  <Icon size={12} />
                  {a.type.replace('_', ' ')}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 dark:text-slate-500">{date}</span>
                  <button onClick={() => setEditing({ announcement: a })} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-purple-500/10 hover:text-purple-500">
                    <Pencil size={13} />
                  </button>
                </div>
              </div>
              <h3 className="mb-1 text-sm font-bold text-slate-900 dark:text-white">{a.titleEn}</h3>
              <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{a.contentEn}</p>
            </motion.div>
          );
        })}
        {announcements && announcements.length === 0 && <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">No announcements yet.</p>}
      </div>

      <AnimatePresence>
        {editing && <AnnouncementEditorPanel announcement={editing.announcement} onClose={() => setEditing(null)} />}
      </AnimatePresence>
    </div>
  );
}