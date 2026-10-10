'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import UserChatWidget from '@/components/chat/UserChatWidget';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  if (isAdmin) return <>{children}</>;

  return (
    <div className="relative min-h-screen bg-mesh">
      <Navbar />
      <main className="relative z-10 pb-10 pt-16 md:pt-20">{children}</main>
      <UserChatWidget />
    </div>
  );
}