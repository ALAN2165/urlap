import type { Metadata } from 'next';
import { Playfair_Display, Alexandria } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import Navbar from '@/components/layout/Navbar';
import QueryProvider from '@/components/shared/QueryProvider';
import IntlProvider from '@/components/shared/IntlProvider';
import './globals.css';

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800', '900'], variable: '--font-sans' });
const alexandria = Alexandria({ subsets: ['arabic'], weight: ['400', '500', '600', '700', '800'], variable: '--font-arabic' });

export const metadata: Metadata = {
  title: 'urlap — Code Challenge Platform',
  description: 'Solve, learn, and level up your coding skills.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${playfair.variable} ${alexandria.variable} font-sans antialiased bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-300`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <IntlProvider>
            <QueryProvider>
              <div className="relative min-h-screen bg-mesh">
                <Navbar />
<main className="relative z-10 pt-20 md:pt-24 min-h-screen">{children}</main>              </div>
              <Toaster richColors position="top-center" />
            </QueryProvider>
          </IntlProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}