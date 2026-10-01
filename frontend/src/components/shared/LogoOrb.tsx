'use client';

import { motion } from 'framer-motion';

interface LogoOrbProps {
  size?: number;
  imgSize?: number;
  float?: boolean;
}

export default function LogoOrb({ size = 200, imgSize = 100, float = true }: LogoOrbProps) {
  return (
    <motion.div
      animate={float ? { y: [-8, 8, -8] } : undefined}
      transition={float ? { repeat: Infinity, duration: 4, ease: 'easeInOut' } : undefined}
      className="relative flex items-center justify-center rounded-full bg-white/60 dark:bg-slate-800/50 backdrop-blur-2xl border border-purple-400/20 dark:border-purple-400/10 shadow-[0_0_50px_rgba(147,51,234,0.3)]"
      style={{ width: size, height: size }}
    >
      <img src="/logo.png" alt="urlap" style={{ height: imgSize, width: 'auto' }} className="object-contain" />
    </motion.div>
  );
}