'use client';

import { motion, useReducedMotion } from 'framer-motion';

/** Faint embers drifting up through a dark panel. */
export function EmberField({ count = 10 }: { count?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: count }, (_, i) => {
        const left = (i * 53) % 100;
        const size = 2 + (i % 3);
        return (
          <motion.span
            key={i}
            className="absolute bottom-0 rounded-full bg-gradient-to-t from-amber-200/70 to-rose-300/70"
            style={{ left: `${left}%`, width: size, height: size }}
            animate={{ y: [0, -120 - (i % 4) * 26], x: [0, i % 2 ? 10 : -10], opacity: [0, 0.55, 0] }}
            transition={{ duration: 5 + (i % 5) * 1.1, delay: (i % 7) * 0.7, repeat: Infinity, ease: 'easeOut' }}
          />
        );
      })}
    </div>
  );
}

/** A frame with a slowly turning rose / gold / lavender border and a soft breathing glow. */
export function AuraFrame({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <div className={`relative overflow-hidden rounded-3xl p-[2px] ${className}`}>
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-gradient-to-r from-rose-300/30 via-amber-200/25 to-violet-300/30 blur-2xl"
        animate={reduce ? undefined : { opacity: [0.45, 0.9, 0.45] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[250%] w-[250%]"
        style={{ x: '-50%', y: '-50%', background: 'conic-gradient(from 0deg, #d99aa8, #dcc489, #a597dc, #d99aa8)' }}
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
      />
      <div className="relative overflow-hidden rounded-[22px] bg-slate-900">{children}</div>
    </div>
  );
}