'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, ChevronUp, ClipboardPaste, Zap, Eye } from 'lucide-react';
import { api } from '@/lib/api';
import { AdminUser, AdminUserSubmission } from '@/types/admin';
import AvatarCircle from '@/components/shared/AvatarCircle';

const STATUS_STYLES: Record<string, string> = {
  ACCEPTED: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  WRONG_ANSWER: 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20',
  RUNTIME_ERROR: 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20',
  TIME_LIMIT_EXCEEDED: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
  COMPILE_ERROR: 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20',
};

const FAST_SOLVE_THRESHOLD_SECONDS = 10;

export default function AdminInspectorPage() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  const { data: results } = useQuery<AdminUser[]>({
    queryKey: ['admin-users-search', debounced],
    queryFn: async () => (await api.get('/admin/users', { params: { search: debounced } })).data,
    enabled: debounced.length > 0 && !selectedUser,
  });

  const { data: submissions, isLoading } = useQuery<AdminUserSubmission[]>({
    queryKey: ['admin-user-submissions', selectedUser?.id],
    queryFn: async () => (await api.get(`/admin/users/${selectedUser!.id}/submissions`)).data,
    enabled: !!selectedUser,
  });

  return (
    <div className="mx-auto max-w-5xl">
      {!selectedUser ? (
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 rtl:left-auto rtl:right-4" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search a student by username…"
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white rtl:pl-4 rtl:pr-11"
          />
          {results && results.length > 0 && (
            <div className="glass mt-2 max-h-80 overflow-y-auto rounded-2xl">
              {results.map((u) => (
                <button
                  key={u.id}
                  onClick={() => { setSelectedUser(u); setSearch(''); }}
                  className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-0 hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/40"
                >
                  <AvatarCircle name={u.username} avatarUrl={u.avatarUrl} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">{u.username}</div>
                    <div className="text-xs text-slate-400 dark:text-slate-500">{u.totalPoints} pts · {u.solvedCount} solved</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="glass mb-5 flex items-center gap-4 rounded-2xl p-5">
            <AvatarCircle name={selectedUser.username} avatarUrl={selectedUser.avatarUrl} size={52} fontSize={20} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-900 dark:text-white">{selectedUser.username}</span>
                {selectedUser.role === 'ADMIN' && <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-400">Admin</span>}
                {selectedUser.isBanned && <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">Banned</span>}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{selectedUser.totalPoints} pts · {selectedUser.solvedCount} solved · {submissions?.length ?? 0} submissions shown</div>
            </div>
            <button
              onClick={() => { setSelectedUser(null); setExpandedId(null); }}
              className="flex-shrink-0 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500 hover:border-purple-400 hover:text-purple-600 dark:border-slate-700/50 dark:text-slate-400"
            >
              Change student
            </button>
          </div>

          {isLoading && <p className="text-sm text-slate-400">Loading submissions…</p>}

          <div className="space-y-2">
            {submissions?.map((s) => {
              const isExpanded = expandedId === s.id;
              const isFast = s.timeSpentSeconds !== null && s.timeSpentSeconds < FAST_SOLVE_THRESHOLD_SECONDS;
              const flagged = s.isPasted || isFast;

              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`glass overflow-hidden rounded-2xl ${flagged ? 'ring-1 ring-red-400/50' : ''}`}
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : s.id)}
                    className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left sm:flex-nowrap"
                  >
                    <span className={`flex-shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${STATUS_STYLES[s.status] ?? STATUS_STYLES.WRONG_ANSWER}`}>
                      {s.status.replace(/_/g, ' ')}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900 dark:text-white">{s.challenge.titleEn}</span>

                    {s.isPasted && (
                      <span className="flex flex-shrink-0 items-center gap-1 rounded-full bg-red-500/15 px-2 py-1 text-[10px] font-bold text-red-600 dark:text-red-400">
                        <ClipboardPaste size={11} /> Pasted
                      </span>
                    )}
                    {isFast && (
                      <span className="flex flex-shrink-0 items-center gap-1 rounded-full bg-red-500/15 px-2 py-1 text-[10px] font-bold text-red-600 dark:text-red-400">
                        <Zap size={11} /> {s.timeSpentSeconds}s solve
                      </span>
                    )}
                    {s.tabSwitches > 0 && (
                      <span className="flex-shrink-0 text-[11px] text-slate-400 dark:text-slate-500">{s.tabSwitches} tab switch{s.tabSwitches !== 1 ? 'es' : ''}</span>
                    )}

                    <span className="flex-shrink-0 text-xs text-slate-400 dark:text-slate-500">{new Date(s.createdAt).toLocaleString()}</span>
                    {isExpanded ? <ChevronUp size={14} className="flex-shrink-0 text-slate-400" /> : <ChevronDown size={14} className="flex-shrink-0 text-slate-400" />}
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-slate-200 px-4 py-3 dark:border-slate-700/50"
                      >
                        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                          <Eye size={12} /> Submitted query
                        </div>
                        <pre dir="ltr" className="scroll-thin max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-100 p-3 font-mono text-xs text-slate-800 dark:bg-slate-900/60 dark:text-slate-200">
                          {s.code}
                        </pre>
                        {s.errorMessage && (
                          <pre dir="ltr" className="mt-2 whitespace-pre-wrap rounded-xl bg-red-50 p-3 font-mono text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300">
                            {s.errorMessage}
                          </pre>
                        )}
                        {s.runtimeMs != null && <div className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">Runtime: {s.runtimeMs}ms · Points: {s.pointsAwarded}</div>}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
            {submissions && submissions.length === 0 && <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">No submissions yet.</p>}
          </div>
        </>
      )}
    </div>
  );
}