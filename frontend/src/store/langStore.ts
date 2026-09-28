// frontend/src/store/langStore.ts — updated to also swap the font class
import { create } from 'zustand';

interface LangState {
  locale: 'en' | 'ar';
  setLocale: (l: 'en' | 'ar') => void;
}

export const useLangStore = create<LangState>((set) => ({
  locale: 'en',
  setLocale: (locale) => {
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
    document.body.classList.toggle('font-arabic', locale === 'ar');
    document.body.classList.toggle('font-sans', locale !== 'ar');
    set({ locale });
  },
}));