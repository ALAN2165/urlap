'use client';

import { motion } from 'framer-motion';

export default function LogoOrb({ size = 200, imgSize = 100 }: { size?: number; imgSize?: number }) {
  return (
    <motion.div
      animate={{ y: [-8, 8, -8] }}
      transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
      className="relative flex items-center justify-center rounded-full bg-white/60 dark:bg-slate-800/50 backdrop-blur-2xl border border-purple-400/20 dark:border-purple-400/10 shadow-[0_0_50px_rgba(168,85,247,0.25)]"
      style={{ width: size, height: size }}
    >
      <img src="/logo.png" alt="urlap" style={{ height: imgSize, width: 'auto' }} className="object-contain" />
    </motion.div>
  );
}