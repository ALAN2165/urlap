// frontend/src/components/auth/AuthBranding.tsx
'use client';

import { motion } from 'framer-motion';
import LogoOrb from '@/components/shared/LogoOrb';

export default function AuthBranding() {
  return (
    <div className="hidden lg:flex relative flex-col items-center justify-center px-12 overflow-hidden">
      <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 30% 20%, rgba(45,212,191,0.2), transparent 50%), radial-gradient(circle at 70% 80%, rgba(109,40,217,0.25), transparent 50%)' }} />
      <div className="relative z-10 mb-10">
        <LogoOrb size={240} imgSize={120} />
      </div>
      <motion.h2 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15 }} className="relative z-10 text-4xl font-bold text-center mb-4 leading-tight">
        Code. Solve.
        <br />
        <span className="bg-gradient-to-r from-teal-400 to-purple-500 bg-clip-text text-transparent">Level up.</span>
      </motion.h2>
      <motion.p initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }} className="relative z-10 text-slate-500 dark:text-white/50 text-center max-w-sm">
        Join a community of developers solving real challenges in a secure, sandboxed environment.
      </motion.p>
    </div>
  );
}