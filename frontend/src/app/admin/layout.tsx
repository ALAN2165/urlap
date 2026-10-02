'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminTopBar from '@/components/admin/AdminTopBar';
import QueryLoader from '@/components/shared/QueryLoader';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role !== 'ADMIN') router.replace('/dashboard');
  }, [user, loading, router]);

  if (loading || !user || user.role !== 'ADMIN') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <QueryLoader compact />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-mesh">
      {/* flex-col on mobile stacks the sticky top bar above <main> correctly;
          lg:flex-row restores the side-by-side desktop layout. The fixed
          desktop <aside> inside AdminSidebar is unaffected either way since
          `fixed` positioning takes it out of flex flow entirely. */}
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