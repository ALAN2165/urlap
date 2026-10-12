'use client';

import { useId } from 'react';
import { useReducedMotion } from 'framer-motion';
import Wave from './Wave';
import Bubbles from './Bubbles';
import { useLiquidProgress } from './useLiquidProgress';
import { LIQUID } from './palette';

const CX = 60;
const CY = 60;
const R_OUT = 53;
const R_IN = 49;
const SPLINE = '0.45 0 0.55 1; 0.45 0 0.55 1';

interface Props {
  percent: number;
  color: string;
  size?: number;
  children?: React.ReactNode;
}

/** A glass orb filled with sloshing, tilting, bubbling liquid up to `percent`. */
export default function LiquidGauge({ percent, color, size = 176, children }: Props) {
  const uid = useId().replace(/:/g, '');
  const reduce = useReducedMotion();
  const animated = !reduce;
  const [ref, t] = useLiquidProgress();

  const pct = Math.min(100, Math.max(0, percent));
  const levelUnits = (pct / 100) * 106; // 100% overfills slightly so wave troughs never expose a gap
  const surfaceY = 114 - t * levelUnits; // starts below the orb, so nothing shows at t=0
  const rise = Math.max(0, levelUnits - 12);

  return (
    <div
      ref={ref}
      className="relative mx-auto"
      style={{ width: size, height: size, filter: `drop-shadow(0 0 16px ${color}30)` }}
    >
      <svg viewBox="0 0 120 120" className="h-full w-full" role="img" aria-label={`${Math.round(pct)} percent`}>
        <defs>
          <clipPath id={`${uid}-orb`}><circle cx={CX} cy={CY} r={R_IN} /></clipPath>
          <clipPath id={`${uid}-below`}><rect x={-100} y={2} width={400} height={400} /></clipPath>
          <linearGradient id={`${uid}-liquid`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.9} />
            <stop offset="100%" stopColor={color} stopOpacity={0.55} />
          </linearGradient>
          <linearGradient id={`${uid}-glass`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={LIQUID.shine} stopOpacity={0.38} />
            <stop offset="50%" stopColor={LIQUID.shine} stopOpacity={0.05} />
            <stop offset="100%" stopColor={LIQUID.shine} stopOpacity={0.22} />
          </linearGradient>
          <radialGradient id={`${uid}-depth`} cx="50%" cy="35%" r="75%">
            <stop offset="0%" stopColor={LIQUID.shine} stopOpacity={0.08} />
            <stop offset="100%" stopColor="#000000" stopOpacity={0.22} />
          </radialGradient>
        </defs>

        <circle cx={CX} cy={CY} r={R_IN} className="fill-slate-200/70 dark:fill-slate-950/70" />

        <g clipPath={`url(#${uid}-orb)`}>
          <g transform={`translate(0 ${surfaceY.toFixed(2)})`}>
            {/* slow tilt of the whole liquid body around the surface centre */}
            <g>
              {animated && (
                <animateTransform
                  attributeName="transform" type="rotate"
                  values="-2 60 0; 2 60 0; -2 60 0" keyTimes="0;0.5;1" calcMode="spline" keySplines={SPLINE}
                  dur="5.5s" repeatCount="indefinite"
                />
              )}
              <Wave amp={3.6} wavelength={64} fromX={0} toX={120} bottom={140} fill={color} fillOpacity={0.32}
                duration={7} reverse bob={2} bobDuration={4.6} animated={animated} />
              <Wave amp={2.8} wavelength={46} fromX={0} toX={120} bottom={140} fill={`url(#${uid}-liquid)`}
                topStroke={LIQUID.shine} topStrokeOpacity={0.3} strokeWidth={1.1}
                duration={4.4} bob={1.4} bobDuration={3.3} animated={animated} />
              <g clipPath={`url(#${uid}-below)`}>
                <Bubbles count={9} xMin={22} xMax={98} rise={rise} seed={3} animated={animated} />
              </g>
            </g>
          </g>
          <circle cx={CX} cy={CY} r={R_IN} fill={`url(#${uid}-depth)`} />
        </g>

        <circle cx={CX} cy={CY} r={R_OUT} fill="none" stroke={`url(#${uid}-glass)`} strokeWidth={2.5} />
        <path d="M 20.5 45.6 A 42 42 0 0 1 45.6 20.5" fill="none" stroke={LIQUID.shine} strokeOpacity={0.26} strokeWidth={3} strokeLinecap="round" />
        <circle cx={31} cy={31} r={1.8} fill={LIQUID.shine} fillOpacity={0.4} />
      </svg>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}