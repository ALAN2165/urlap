'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  if (isAdmin) return <>{children}</>;

  return (
    <div className="relative min-h-screen bg-mesh">
      <Navbar />
      <main className="relative z-10 pt-20 md:pt-24 min-h-screen">{children}</main>
    </div>
  );
}