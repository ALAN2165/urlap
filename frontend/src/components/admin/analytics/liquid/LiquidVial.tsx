'use client';

import { useId } from 'react';
import { useReducedMotion } from 'framer-motion';
import Wave from './Wave';
import Bubbles from './Bubbles';
import { useLiquidProgress } from './useLiquidProgress';
import { LIQUID } from './palette';

export interface VialLayer {
  key: string;
  name: string;
  value: number;
  color: string; // 6-digit hex
}

const TUBE = 'M 20 22 L 20 226 A 40 40 0 0 0 100 226 L 100 22 Z';
const BOTTOM = 272;      // just below the visible bottom (266), so layers start hidden
const UNITS_FULL = 220;  // when full, the top surface sits at y = 52

/** A test tube of layered liquids, bottom → top in the order given.
 *  Each layer's wavy boundary drifts at its own speed, like a layered cocktail. */
export default function LiquidVial({ layers }: { layers: VialLayer[] }) {
  const uid = useId().replace(/:/g, '');
  const reduce = useReducedMotion();
  const animated = !reduce;
  const [ref, t] = useLiquidProgress();

  const total = layers.reduce((sum, l) => sum + l.value, 0);
  let acc = 0;
  const placed = layers.map((l, i) => {
    acc += l.value;
    return { ...l, index: i, frac: total > 0 ? acc / total : 0 };
  });
  const topY = BOTTOM - t * UNITS_FULL;

  return (
    <div ref={ref} className="relative" style={{ width: 124, height: 300, filter: 'drop-shadow(0 0 18px rgba(155,138,216,0.16))' }}>
      <svg viewBox="0 0 120 290" className="h-full w-full" role="img" aria-label="Submission outcomes">
        <defs>
          <clipPath id={`${uid}-tube`}><path d={TUBE} /></clipPath>
          <clipPath id={`${uid}-below`}><rect x={-100} y={2} width={400} height={500} /></clipPath>
          <linearGradient id={`${uid}-glass`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={LIQUID.shine} stopOpacity={0.3} />
            <stop offset="50%" stopColor={LIQUID.shine} stopOpacity={0.06} />
            <stop offset="100%" stopColor={LIQUID.shine} stopOpacity={0.26} />
          </linearGradient>
          <linearGradient id={`${uid}-cyl`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#000000" stopOpacity={0.24} />
            <stop offset="28%" stopColor="#000000" stopOpacity={0} />
            <stop offset="72%" stopColor="#000000" stopOpacity={0} />
            <stop offset="100%" stopColor="#000000" stopOpacity={0.24} />
          </linearGradient>
          {placed.map((l) => (
            <linearGradient key={l.key} id={`${uid}-lg-${l.index}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={l.color} stopOpacity={0.92} />
              <stop offset="100%" stopColor={l.color} stopOpacity={0.7} />
            </linearGradient>
          ))}
        </defs>

        <path d={TUBE} className="fill-slate-200/70 dark:fill-slate-950/70" />

        <g clipPath={`url(#${uid}-tube)`}>
          {/* top-most layer first: lower layers paint over it, leaving a wavy boundary between each pair */}
          {[...placed].reverse().map((l) => {
            const y = BOTTOM - t * l.frac * UNITS_FULL;
            return (
              <g key={l.key} transform={`translate(0 ${y.toFixed(2)})`}>
                <Wave
                  amp={2.6} wavelength={48 + l.index * 8} fromX={0} toX={120} bottom={260}
                  fill={`url(#${uid}-lg-${l.index})`}
                  topStroke={LIQUID.shine} topStrokeOpacity={0.24} strokeWidth={1}
                  duration={5 + l.index * 0.8} reverse={l.index % 2 === 1}
                  bob={1.2} bobDuration={3 + l.index * 0.5} animated={animated}
                />
              </g>
            );
          })}

          {total > 0 && (
            <g transform={`translate(0 ${topY.toFixed(2)})`}>
              <g clipPath={`url(#${uid}-below)`}>
                <Bubbles count={12} xMin={28} xMax={92} rise={UNITS_FULL - 10} seed={7} animated={animated} />
              </g>
            </g>
          )}

          <rect x={20} y={20} width={80} height={252} fill={`url(#${uid}-cyl)`} />
          <rect x={30} y={44} width={5} height={180} rx={2.5} fill={LIQUID.shine} fillOpacity={0.1} />
        </g>

        <path d={TUBE} fill="none" stroke={`url(#${uid}-glass)`} strokeWidth={3} />
        <rect x={13} y={11} width={94} height={13} rx={6.5} fill="none" stroke={`url(#${uid}-glass)`} strokeWidth={2.5} />
      </svg>
    </div>
  );
}