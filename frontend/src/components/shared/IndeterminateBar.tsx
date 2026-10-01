'use client';

import { motion } from 'framer-motion';

export default function IndeterminateBar({ className = '' }: { className?: string }) {
  return (
    <div className={`relative h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700/50 ${className}`}>
      <motion.div
        className="absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-purple-500/30 via-purple-500 to-purple-500/30"
        animate={{ left: ['-35%', '100%'] }}
        transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}