'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { BadgeCheck, Sparkles } from 'lucide-react';
import { useExtra } from '@/i18n/extra';

// Decorative "barcode" strip along the bottom of the ID card.
const BARS = [3, 7, 4, 9, 5, 8, 3, 6, 9, 4, 7, 5, 8, 3, 9, 6, 4, 8, 5, 7, 3, 9, 6, 4, 7, 5, 9, 3];

export default function CreatorBadge() {
  const x = useExtra();
  const reduce = useReducedMotion();
  const [imgFailed, setImgFailed] = useState(false);

  // Pointer position across the card, 0..1. Drives the 3D tilt and the spotlight.
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(py, [0, 1], [6, -6]), { stiffness: 180, damping: 18 });
  const rotateY = useSpring(useTransform(px, [0, 1], [-8, 8]), { stiffness: 180, damping: 18 });
  const spotX = useTransform(px, (v) => `${v * 100}%`);
  const spotY = useTransform(py, (v) => `${v * 100}%`);
  const spotlight = useMotionTemplate`radial-gradient(260px circle at ${spotX} ${spotY}, rgba(168,85,247,0.24), transparent 65%)`;

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  }
  function onLeave() {
    px.set(0.5);
    py.set(0.5);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className="mx-auto w-full max-w-md px-1"
      style={{ perspective: 1000 }}
    >
      <motion.div
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        style={reduce ? undefined : { rotateX, rotateY }}
        className="group relative"
      >
        {/* soft glow underneath the card */}
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-2 -z-10 rounded-[2rem] bg-gradient-to-r from-purple-600/40 via-fuchsia-500/30 to-cyan-400/40 opacity-40 blur-2xl transition-opacity duration-500 group-hover:opacity-90"
        />

        {/* light beam travelling around the border */}
        <div className="relative overflow-hidden rounded-3xl p-[1.5px]">
          <motion.div
            aria-hidden
            className="absolute left-1/2 top-1/2 h-[320%] w-[320%]"
            style={{
              x: '-50%',
              y: '-50%',
              background: 'conic-gradient(from 0deg, transparent 0deg, transparent 230deg, #a855f7 290deg, #22d3ee 330deg, transparent 360deg)',
            }}
            animate={reduce ? undefined : { rotate: 360 }}
            transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
          />
          <span aria-hidden className="pointer-events-none absolute inset-0 rounded-3xl border border-white/10" />

          {/* the card */}
          <div className="relative overflow-hidden rounded-[22px] bg-slate-950/90 p-5 backdrop-blur-xl sm:p-6">
            {/* depth layers: dot grid, colour blobs, cursor spotlight, scan sweep */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(rgba(255,255,255,0.09)_1px,transparent_1px)] [background-size:14px_14px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_80%)]"
            />
            <motion.span
              aria-hidden
              className="pointer-events-none absolute -start-10 -top-12 h-40 w-40 rounded-full bg-purple-500/25 blur-3xl"
              animate={reduce ? undefined : { x: [0, 16, 0], y: [0, 10, 0] }}
              transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.span
              aria-hidden
              className="pointer-events-none absolute -bottom-14 -end-8 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl"
              animate={reduce ? undefined : { x: [0, -14, 0], y: [0, -10, 0] }}
              transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: spotlight }} />
            {!reduce && (
              <motion.span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 w-24 -skew-x-12 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent"
                initial={{ x: '-150%' }}
                animate={{ x: '600%' }}
                transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 4.5, ease: 'easeInOut' }}
              />
            )}

            {/* Dev ID label */}
            <div className="relative mb-4 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500 rtl:normal-case rtl:tracking-normal">{x('devId')}</span>
              <span dir="ltr" className="font-mono text-[10px] text-slate-500">urlap · core</span>
            </div>

            <div className="relative flex items-center gap-4 sm:gap-5">
              {/* photo */}
              <div className="relative flex-shrink-0">
                <div className="rounded-[24px] bg-gradient-to-br from-purple-400 via-fuchsia-400 to-cyan-300 p-[2px] shadow-[0_0_22px_rgba(168,85,247,0.55)] transition-shadow duration-500 group-hover:shadow-[0_0_36px_rgba(34,211,238,0.6)]">
                  <div className="relative h-[76px] w-[76px] overflow-hidden rounded-[22px] bg-slate-900 sm:h-[84px] sm:w-[84px]">
                    {imgFailed ? (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-600 to-fuchsia-600 text-xl font-black text-white">
                        {x('creatorInitials')}
                      </div>
                    ) : (
                      <Image
                        src="/me.png"
                        alt={x('creatorName')}
                        fill
                        sizes="84px"
                        quality={92}
                        className="object-cover object-top transition-transform duration-500 group-hover:scale-110"
                        onError={() => setImgFailed(true)}
                      />
                    )}
                    <span aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-white/10" />
                  </div>
                </div>
                {/* live status dot */}
                <span className="absolute -bottom-1 -end-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-950">
                  <span className="absolute h-3 w-3 animate-ping rounded-full bg-emerald-400/70" />
                  <span className="relative h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </span>
              </div>

              {/* identity */}
              <div className="min-w-0 flex-1 text-start">
                <span className="mb-1.5 inline-flex items-center gap-1 rounded-full border border-purple-400/30 bg-purple-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-purple-200 rtl:normal-case rtl:tracking-normal">
                  <Sparkles size={10} /> {x('architectTag')}
                </span>
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400 rtl:normal-case rtl:tracking-normal">{x('craftedBy')}</div>
                <div className="flex items-center gap-1.5">
                  <span className="bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-[length:200%_100%] bg-clip-text text-xl font-black leading-tight text-transparent transition-[background-position] duration-700 group-hover:[background-position:100%_0] sm:text-2xl">
                    {x('creatorName')}
                  </span>
                  <BadgeCheck size={17} className="flex-shrink-0 text-cyan-300" />
                </div>
                <div className="mt-0.5 text-xs leading-snug text-slate-400">{x('creatorRole')}</div>
              </div>
            </div>

            {/* barcode strip */}
            <div dir="ltr" className="relative mt-5 flex h-5 items-end gap-[2px] opacity-70 transition-opacity duration-500 group-hover:opacity-100">
              {BARS.map((h, i) => (
                <span
                  key={i}
                  className="w-[2px] flex-1 rounded-full bg-gradient-to-t from-purple-400/70 to-cyan-300/70"
                  style={{ height: `${h * 11}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}