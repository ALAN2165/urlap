'use client';

import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-20 h-11" />;

  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label="Toggle theme"
      dir="ltr"
      className="relative w-20 h-11 rounded-full bg-slate-200/70 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700/60 backdrop-blur-xl"
    >
      <motion.div
        className="absolute top-1 left-1 w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 shadow-[0_0_16px_rgba(168,85,247,0.45)] flex items-center justify-center"
        animate={{ x: isDark ? 36 : 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.div key="moon" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.25 }}>
              <Moon size={16} className="text-white" />
            </motion.div>
          ) : (
            <motion.div key="sun" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.25 }}>
              <Sun size={16} className="text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </button>
  );
}