'use client';

import { motion, useReducedMotion } from 'framer-motion';

/** Embers rising from the bottom edge of a dark panel. */
export function EmberField({ count = 18 }: { count?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: count }, (_, i) => {
        const left = (i * 53) % 100;
        const size = 2 + (i % 4);
        return (
          <motion.span
            key={i}
            className="absolute bottom-0 rounded-full bg-gradient-to-t from-amber-400 to-rose-500"
            style={{ left: `${left}%`, width: size, height: size }}
            animate={{ y: [0, -140 - (i % 4) * 30], x: [0, i % 2 ? 14 : -14], opacity: [0, 0.9, 0] }}
            transition={{ duration: 3.5 + (i % 5) * 0.8, delay: (i % 7) * 0.45, repeat: Infinity, ease: 'easeOut' }}
          />
        );
      })}
    </div>
  );
}

/** A frame with a slowly rotating crimson / gold / violet border and a deep glow. */
export function AuraFrame({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <div className={`relative overflow-hidden rounded-3xl p-[2px] shadow-[0_0_70px_-10px_rgba(244,63,94,0.55)] ${className}`}>
      <motion.div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[250%] w-[250%]"
        style={{ x: '-50%', y: '-50%', background: 'conic-gradient(from 0deg, #f43f5e, #f59e0b, #7c3aed, #f43f5e)' }}
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
      />
      <div className="relative overflow-hidden rounded-[22px] bg-slate-950">{children}</div>
    </div>
  );
}