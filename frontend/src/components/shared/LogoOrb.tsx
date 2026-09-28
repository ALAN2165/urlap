'use client';

import { motion } from 'framer-motion';

export default function LogoOrb({ size = 64, imgSize = 40 }: { size?: number; imgSize?: number }) {
  return (
    <motion.div
      animate={{ y: [-4, 4, -4] }}
      transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
      className="relative flex items-center justify-center rounded-full bg-white/40 dark:bg-white/5 backdrop-blur-2xl border border-teal-400/20 dark:border-white/10 shadow-[0_0_40px_rgba(20,184,166,0.3)] shrink-0"
      style={{ width: size, height: size }}
    >
      <img 
        src="/logo.png" 
        alt="urlap" 
        style={{ height: imgSize, width: imgSize }} 
        className="object-contain drop-shadow-md" 
      />
    </motion.div>
  );
}