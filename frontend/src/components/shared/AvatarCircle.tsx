'use client';

import { motion } from 'framer-motion';

export default function AvatarCircle({ name, size = 40, fontSize, className = '' }: { name: string; size?: number; fontSize?: number; className?: string }) {
  const letter = name?.charAt(0)?.toUpperCase() || '?';
  return (
    <motion.div
      whileHover={{ scale: 1.08 }}
      className={`flex items-center justify-center rounded-full font-bold text-white bg-gradient-to-br from-purple-500 to-purple-700 shadow-[0_0_16px_rgba(168,85,247,0.3)] ${className}`}
      style={{ width: size, height: size, fontSize: fontSize ?? size * 0.42 }}
    >
      {letter}
    </motion.div>
  );
}