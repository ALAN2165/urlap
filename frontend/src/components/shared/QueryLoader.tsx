'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocale } from 'next-intl';
import { Database } from 'lucide-react';

const MESSAGES: Record<string, string[]> = {
  en: ['Connecting to database…', 'Parsing query…', 'Optimizing execution plan…', 'Fetching rows…', 'Almost there…'],
  ar: ['جارٍ الاتصال بقاعدة البيانات…', 'جارٍ تحليل الاستعلام…', 'جارٍ تحسين خطة التنفيذ…', 'جارٍ جلب الصفوف…', 'على وشك الانتهاء…'],
};

export default function QueryLoader({ compact = false }: { compact?: boolean }) {
  const locale = useLocale();
  const list = MESSAGES[locale] ?? MESSAGES.en;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % list.length), 1400);
    return () => clearInterval(id);
  }, [list.length]);

  return (
    <div className={`flex flex-col items-center justify-center ${compact ? 'py-8' : 'py-20'}`}>
      <div className="relative mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 rounded-2xl border-2 border-transparent border-t-purple-500"
        />
        <Database size={22} className="text-purple-400" />
      </div>

      <div className="flex items-center gap-1 font-mono text-sm text-slate-500 dark:text-slate-400">
        <span className="text-purple-400">{'>'}</span>
        <AnimatePresence mode="wait">
          <motion.span
            key={index}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
          >
            {list[index]}
          </motion.span>
        </AnimatePresence>
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.9, repeat: Infinity }}
          className="inline-block h-4 w-[2px] bg-purple-400"
        />
      </div>

      <div className="mt-4 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-purple-400"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </div>
  );
}