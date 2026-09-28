'use client';

import { useEffect } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';

export default function CountUp({ to }: { to: number }) {
  const value = useMotionValue(0);
  const display = useTransform(value, (v) => Math.round(v).toLocaleString());

  useEffect(() => {
    const controls = animate(value, to, { duration: 1.2, ease: 'easeOut' });
    return () => controls.stop();
  }, [to, value]);

  return <motion.span>{display}</motion.span>;
}