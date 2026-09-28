'use client';

import { motion } from 'framer-motion';
import { useLangStore } from '@/store/langStore';

export default function LanguageToggle() {
  const { locale, setLocale } = useLangStore();
  const isAr = locale === 'ar';

  return (
    <button
      onClick={() => setLocale(isAr ? 'en' : 'ar')}
      aria-label="Toggle language"
      dir="ltr"
      className="relative w-24 h-11 rounded-full bg-slate-200/70 dark:bg-white/[0.06] border border-slate-300 dark:border-white/[0.1] backdrop-blur-xl flex items-center px-1.5 text-[12px] font-bold"
    >
      <motion.div
        className="absolute top-1.5 h-8 w-[42px] rounded-full bg-gradient-to-br from-teal-400 to-purple-500 shadow-[0_0_14px_rgba(45,212,191,0.5)]"
        animate={{ x: isAr ? 42 : 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      />
      <span className={`relative z-10 flex-1 text-center transition-colors ${!isAr ? 'text-white' : 'text-slate-500 dark:text-white/40'}`}>EN</span>
      <span className={`relative z-10 flex-1 text-center transition-colors ${isAr ? 'text-white' : 'text-slate-500 dark:text-white/40'}`}>AR</span>
    </button>
  );
}