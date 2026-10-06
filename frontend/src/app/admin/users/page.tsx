'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Search, ShieldCheck, Ban, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { AdminUser } from '@/types/admin';
import AvatarCircle from '@/components/shared/AvatarCircle';

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(id);
  }, [search]);

  const { data: users, isLoading } = useQuery<AdminUser[]>({
    queryKey: ['admin-users', debounced],
    queryFn: async () => (await api.get('/admin/users', { params: { search: debounced || undefined } })).data,
  });

  async function toggleBan(u: AdminUser) {
    try {
      await api.put(`/admin/users/${u.id}/ban`, { isBanned: !u.isBanned });
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(u.isBanned ? `${u.username} unbanned.` : `${u.username} banned.`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Could not update ban status.');
    }
  }

  async function toggleRole(u: AdminUser) {
    const nextRole = u.role === 'ADMIN' ? 'STUDENT' : 'ADMIN';
    if (!confirm(`Make ${u.username} ${nextRole === 'ADMIN' ? 'an admin' : 'a regular student'}?`)) return;
    try {
      await api.put(`/admin/users/${u.id}/role`, { role: nextRole });
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(`${u.username} is now ${nextRole === 'ADMIN' ? 'an admin' : 'a student'}.`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Could not update role.');
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="relative mb-5">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 rtl:left-auto rtl:right-4" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by username…"
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white rtl:pl-4 rtl:pr-11"
        />
      </div>

      {isLoading && <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>}

      <div className="space-y-2">
        {users?.map((u) => {
          const isSelf = u.id === me?.id;
          return (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`glass flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center ${u.isBanned ? 'opacity-70' : ''}`}
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <AvatarCircle name={u.username} avatarUrl={u.avatarUrl} size={38} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-sm font-bold text-slate-900 dark:text-white">{u.username}</span>
                    {isSelf && <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-400">You</span>}
                    {u.role === 'ADMIN' && (
                      <span className="flex items-center gap-1 rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-400">
                        <ShieldCheck size={10} />Admin
                      </span>
                    )}
                    {u.isBanned && <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">Banned</span>}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Joined {new Date(u.createdAt).toLocaleDateString()}</div>
                </div>
              </div>

              <div className="flex flex-shrink-0 items-center gap-4 text-xs text-slate-500 dark:text-slate-400 sm:gap-6">
                <div className="text-center">
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{u.totalPoints}</div>
                  <div>pts</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{u.solvedCount}</div>
                  <div>solved</div>
                </div>
              </div>

              <div className="flex flex-shrink-0 items-center gap-2">
                <button
                  onClick={() => toggleRole(u)}
                  disabled={isSelf}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-purple-400 hover:text-purple-600 disabled:opacity-40 dark:border-slate-700/50 dark:text-slate-300"
                >
                  {u.role === 'ADMIN' ? 'Make Student' : 'Make Admin'}
                </button>
                <button
                  onClick={() => toggleBan(u)}
                  disabled={isSelf}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-40 ${
                    u.isBanned ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'
                  }`}
                >
                  {u.isBanned ? <CheckCircle2 size={12} /> : <Ban size={12} />}
                  {u.isBanned ? 'Unban' : 'Ban'}
                </button>
              </div>
            </motion.div>
          );
        })}
        {users && users.length === 0 && <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">No users found.</p>}
      </div>
    </div>
  );
}