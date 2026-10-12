'use client';

import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { animate, useInView, useReducedMotion } from 'framer-motion';

/** Returns [ref, t]. Once the element scrolls into view, `t` springs 0 → 1
 *  with a little overshoot, so liquid rises, sloshes past its level, then settles. */
export function useLiquidProgress(delay = 0): [RefObject<HTMLDivElement>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const reduce = useReducedMotion();
  const [t, setT] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) { setT(1); return; }
    const controls = animate(0, 1, {
      type: 'spring',
      stiffness: 36,
      damping: 7.5,
      mass: 1,
      delay,
      onUpdate: (v: number) => setT(v),
    });
    return () => controls.stop();
  }, [inView, reduce, delay]);

  return [ref, t];
}