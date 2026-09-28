// frontend/src/components/shared/IntlProvider.tsx
'use client';

import { NextIntlClientProvider } from 'next-intl';
import { useLangStore } from '@/store/langStore';
import enMessages from '@/i18n/messages/en.json';
import arMessages from '@/i18n/messages/ar.json';

export default function IntlProvider({ children }: { children: React.ReactNode }) {
  const locale = useLangStore((s) => s.locale);
  const messages = locale === 'ar' ? arMessages : enMessages;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}