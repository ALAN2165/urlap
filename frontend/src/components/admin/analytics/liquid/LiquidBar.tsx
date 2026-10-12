'use client';

import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';

interface LiquidBarProps {
  pct: number;
  color: string; // 6-digit hex
  delay?: number;
}

/** A glass tube filled with flowing elixir. The goo filter melts the droplets into the
 *  leading edge so the front of the liquid looks like it's rippling and dripping forward. */
export default function LiquidBar({ pct, color, delay = 0 }: LiquidBarProps) {
  const reduce = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const visible = useInView(wrapRef); // pause the loops while off-screen to keep scrolling smooth
  const width = `${Math.min(100, Math.max(pct, 5))}%`;
  const edge = `${color}ee`;

  const bodyImage =
    `linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.14) 50%, rgba(255,255,255,0) 100%), ` +
    `linear-gradient(90deg, ${color}99 0%, ${edge} 100%)`;

  return (
    <div ref={wrapRef} className={visible ? '' : 'liquid-paused'}>
      <div
        className="relative h-8 overflow-hidden rounded-full bg-slate-200/80 shadow-[inset_0_2px_6px_rgba(15,23,42,0.14)] ring-1 ring-inset ring-slate-300/60 dark:bg-slate-950/70 dark:shadow-[inset_0_2px_8px_rgba(0,0,0,0.55)] dark:ring-white/10"
        style={{ boxShadow: `0 0 18px -8px ${color}44` }}
      >
        <div className="absolute inset-0" style={{ filter: 'url(#liquid-goo)' }}>
          <motion.div
            className="absolute inset-y-0 left-0"
            initial={{ width: reduce ? width : '0%' }}
            whileInView={{ width }}
            viewport={{ once: true, amount: 0.6 }}
            transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 46, damping: 9, delay }}
          >
            <div className="liquid-body absolute inset-0 rounded-full" style={{ backgroundImage: bodyImage }} />
            <span className="liquid-drop-a absolute -right-1 top-[18%] h-3.5 w-3.5 rounded-full" style={{ background: edge }} />
            <span className="liquid-drop-b absolute -right-2 top-[52%] h-3 w-3 rounded-full" style={{ background: edge }} />
            <span className="liquid-drop-c absolute right-1 top-[2%] h-2.5 w-2.5 rounded-full" style={{ background: edge }} />
          </motion.div>
        </div>

        {/* soft glass shine on top of the tube */}
        <div className="pointer-events-none absolute inset-x-3 top-1 h-1.5 rounded-full bg-gradient-to-r from-white/25 via-white/10 to-transparent dark:from-white/12 dark:via-white/5" />
      </div>
    </div>
  );
}