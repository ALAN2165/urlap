'use client';

import { motion } from 'framer-motion';

export default function Switch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      dir="ltr"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-8 w-14 rounded-full border transition-colors duration-300 disabled:opacity-50 ${
        checked ? 'border-transparent bg-gradient-to-r from-purple-500 to-purple-700' : 'border-slate-300 bg-slate-200 dark:border-slate-700/60 dark:bg-slate-800/60'
      }`}
    >
      <motion.div
        className="absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow-md"
        animate={{ x: checked ? 24 : 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      />
    </button>
  );
}