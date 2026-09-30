'use client';

import { motion } from 'framer-motion';

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/api\/?$/, '');

interface Props {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  fontSize?: number;
  className?: string;
}

export default function AvatarCircle({ name, avatarUrl, size = 40, fontSize, className = '' }: Props) {
  const letter = name?.charAt(0)?.toUpperCase() || '?';
  const src = avatarUrl
    ? avatarUrl.startsWith('data:') || avatarUrl.startsWith('http')
      ? avatarUrl
      : `${API_ORIGIN}${avatarUrl}`
    : null;

  return (
    <motion.div
      whileHover={{ scale: 1.08 }}
      className={`flex items-center justify-center overflow-hidden rounded-full font-bold text-white bg-gradient-to-br from-purple-500 to-purple-700 shadow-[0_0_16px_rgba(168,85,247,0.3)] ${className}`}
      style={{ width: size, height: size, fontSize: fontSize ?? size * 0.42 }}
    >
      {src ? <img src={src} alt={name} className="h-full w-full object-cover" /> : letter}
    </motion.div>
  );
}