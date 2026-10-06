'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminTopBar from '@/components/admin/AdminTopBar';
import QueryLoader from '@/components/shared/QueryLoader';
import { useAdminAlertsSocket } from '@/hooks/useAdminAlertsSocket';
import { useAlertsStore } from '@/store/alertsStore';
import { api } from '@/lib/api';
import { AdminAlert } from '@/types/admin';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const setAlerts = useAlertsStore((s) => s.setAlerts);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role !== 'ADMIN') router.replace('/dashboard');
  }, [user, loading, router]);

  useAdminAlertsSocket();

  const { data: initialAlerts } = useQuery<AdminAlert[]>({
  queryKey: ['admin-alerts'],
  queryFn: async () => (await api.get('/admin/alerts')).data,
  enabled: !!user && user.role === 'ADMIN',
  refetchInterval: 20000,
});

  useEffect(() => {
    if (initialAlerts) setAlerts(initialAlerts);
  }, [initialAlerts, setAlerts]);

  if (loading || !user || user.role !== 'ADMIN') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <QueryLoader compact />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-mesh">
      <div className="relative z-10 flex min-h-screen flex-col lg:flex-row">
        <AdminSidebar />
        <main className="flex-1 overflow-x-hidden px-4 py-6 sm:px-6 md:px-8 md:py-8 lg:ml-64">
          <AdminTopBar />
          {children}
        </main>
      </div>
    </div>
  );
}