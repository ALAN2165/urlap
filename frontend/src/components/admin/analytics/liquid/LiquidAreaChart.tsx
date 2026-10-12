'use client';

import { useId, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import Bubbles from './Bubbles';
import { useLiquidProgress } from './useLiquidProgress';
import { LIQUID } from './palette';

interface Point { label: string; value: number }
interface Props { data: Point[]; color?: string; unit?: string }

const W = 640;
const H = 300;
const PAD = { left: 46, right: 26, top: 26, bottom: 40 };
const BASE = H - PAD.bottom;
const CHART_H = BASE - PAD.top;
const CHART_W = W - PAD.left - PAD.right;
const SPLINE = '0.45 0 0.55 1; 0.45 0 0.55 1';

interface XY { x: number; y: number }

/** Smooth curve through the points (Catmull-Rom → Bézier), never dipping below the baseline. */
function smoothLine(pts: XY[], baseline: number): string {
  if (pts.length === 0) return '';
  const f = (n: number) => n.toFixed(2);
  let d = `M ${f(pts[0].x)} ${f(pts[0].y)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1y = Math.min(p1.y + (p2.y - p0.y) / 6, baseline);
    const c2y = Math.min(p2.y - (p3.y - p1.y) / 6, baseline);
    d += ` C ${f(p1.x + (p2.x - p0.x) / 6)} ${f(c1y)}, ${f(p2.x - (p3.x - p1.x) / 6)} ${f(c2y)}, ${f(p2.x)} ${f(p2.y)}`;
  }
  return d;
}

/** A translucent copy of the liquid that gently bobs and sways behind the main body. */
function Swell({ d, color, opacity, bob, bobDur, sway, swayDur, animated }: {
  d: string; color: string; opacity: number; bob: number; bobDur: number; sway: number; swayDur: number; animated: boolean;
}) {
  return (
    <g>
      {animated && (
        <animateTransform
          attributeName="transform" type="translate"
          values={`0 0; 0 ${-bob}; 0 0`} keyTimes="0;0.5;1" calcMode="spline" keySplines={SPLINE}
          dur={`${bobDur}s`} repeatCount="indefinite"
        />
      )}
      <g>
        {animated && (
          <animateTransform
            attributeName="transform" type="translate"
            values={`${-sway} 0; ${sway} 0; ${-sway} 0`} keyTimes="0;0.5;1" calcMode="spline" keySplines={SPLINE}
            dur={`${swayDur}s`} repeatCount="indefinite"
          />
        )}
        <path d={d} fill={color} fillOpacity={opacity} />
      </g>
    </g>
  );
}

/** Area chart drawn as liquid in a trough: layered swells, a drifting shimmer, rising bubbles,
 *  and a soft pulse that flows along the surface. */
export default function LiquidAreaChart({ data, color = LIQUID.lavender, unit = 'submissions' }: Props) {
  const uid = useId().replace(/:/g, '');
  const reduce = useReducedMotion();
  const animated = !reduce;
  const [ref, t] = useLiquidProgress();
  const [hover, setHover] = useState<number | null>(null);

  const n = data.length;
  if (n < 2) {
    return <div className="flex h-48 items-center justify-center text-sm text-slate-400 dark:text-slate-500">No data yet.</div>;
  }

  const maxVal = Math.max(...data.map((d) => d.value), 0);
  const niceMax = Math.max(4, Math.ceil(maxVal / 4) * 4);

  const pts: XY[] = data.map((d, i) => ({
    x: PAD.left + (i / (n - 1)) * CHART_W,
    y: BASE - (d.value / niceMax) * CHART_H * t,
  }));
  const first = pts[0];
  const last = pts[pts.length - 1];

  const linePath = smoothLine(pts, BASE);
  const areaPath = `${linePath} L ${last.x.toFixed(2)} ${BASE} L ${first.x.toFixed(2)} ${BASE} Z`;

  // The back swells are extended past both axes so their sway never exposes an edge.
  const left = PAD.left - 24;
  const right = W - PAD.right + 24;
  const extPts: XY[] = [{ x: left, y: first.y }, ...pts, { x: right, y: last.y }];
  const extArea = `${smoothLine(extPts, BASE)} L ${right} ${BASE} L ${left} ${BASE} Z`;

  function handleMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    let bestDist = Infinity;
    pts.forEach((p, i) => {
      const dist = Math.abs(p.x - x);
      if (dist < bestDist) { best = i; bestDist = dist; }
    });
    setHover(best);
  }

  const hp = hover !== null ? pts[hover] : null;
  const tooltipAbove = hp ? hp.y > 80 : true;

  return (
    <div>
      <div className="scroll-thin -mx-1 overflow-x-auto pb-2">
        <div ref={ref} className="relative min-w-[520px] px-1">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="block h-auto w-full text-slate-500 dark:text-slate-400"
            role="img"
            aria-label="Submission volume over the last 7 days"
            onPointerMove={handleMove}
            onPointerLeave={() => setHover(null)}
          >
            <defs>
              <clipPath id={`${uid}-chart`}><rect x={PAD.left} y={0} width={CHART_W} height={BASE + 1} /></clipPath>
              <clipPath id={`${uid}-area`}><path d={areaPath} /></clipPath>
              <linearGradient id={`${uid}-fill`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.62} />
                <stop offset="100%" stopColor={color} stopOpacity={0.16} />
              </linearGradient>
              <linearGradient id={`${uid}-shimmer`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="150" y2="40" spreadMethod="repeat">
                <stop offset="0%" stopColor={LIQUID.shine} stopOpacity={0} />
                <stop offset="50%" stopColor={LIQUID.shine} stopOpacity={0.12} />
                <stop offset="100%" stopColor={LIQUID.shine} stopOpacity={0} />
                {animated && (
                  <animateTransform attributeName="gradientTransform" type="translate" from="0 0" to="150 0" dur="6s" repeatCount="indefinite" />
                )}
              </linearGradient>
            </defs>

            {/* grid + y labels */}
            {[0, 1, 2, 3, 4].map((k) => {
              const y = BASE - (k / 4) * CHART_H;
              return (
                <g key={k}>
                  <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="currentColor" strokeOpacity={0.14} strokeDasharray={k === 0 ? undefined : '3 5'} />
                  <text x={PAD.left - 10} y={y + 4} textAnchor="end" fontSize={13} fill="currentColor">{Math.round((niceMax / 4) * k)}</text>
                </g>
              );
            })}

            {/* x labels */}
            {data.map((d, i) => (
              <text key={d.label + i} x={pts[i].x} y={H - 14} textAnchor="middle" fontSize={13} fill="currentColor">{d.label}</text>
            ))}

            <g clipPath={`url(#${uid}-chart)`}>
              <Swell d={extArea} color={color} opacity={0.12} bob={7} bobDur={4.8} sway={10} swayDur={6.6} animated={animated} />
              <Swell d={extArea} color={color} opacity={0.2} bob={4} bobDur={3.8} sway={7} swayDur={5.2} animated={animated} />

              <path d={areaPath} fill={`url(#${uid}-fill)`} />
              <path d={areaPath} fill={`url(#${uid}-shimmer)`} />

              <g clipPath={`url(#${uid}-area)`}>
                <g transform={`translate(0 ${BASE - CHART_H})`}>
                  <Bubbles count={11} xMin={PAD.left + 10} xMax={W - PAD.right - 10} rise={CHART_H} seed={5} animated={animated} />
                </g>
              </g>

              <path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 4px ${color}66)` }} />
              {animated && (
                <path d={linePath} fill="none" stroke={LIQUID.shine} strokeOpacity={0.5} strokeWidth={2.5} strokeLinecap="round" pathLength={300} strokeDasharray="22 278">
                  <animate attributeName="stroke-dashoffset" from="300" to="0" dur="4s" repeatCount="indefinite" />
                </path>
              )}
            </g>

            {hp && <line x1={hp.x} x2={hp.x} y1={PAD.top} y2={BASE} stroke={color} strokeOpacity={0.35} strokeDasharray="3 4" />}

            {pts.map((p, i) => (
              <g key={i} opacity={Math.min(1, t * 1.2)}>
                {animated && (
                  <circle cx={p.x} cy={p.y} r={5} fill="none" stroke={color} strokeWidth={1.5}>
                    <animate attributeName="r" values="5;14" dur="2.6s" begin={`${(i * 0.3).toFixed(1)}s`} repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.45;0" dur="2.6s" begin={`${(i * 0.3).toFixed(1)}s`} repeatCount="indefinite" />
                  </circle>
                )}
                <circle cx={p.x} cy={p.y} r={hover === i ? 6.5 : 4.5} fill={LIQUID.shine} stroke={color} strokeWidth={2.5} />
              </g>
            ))}
          </svg>

          {hp && hover !== null && (
            <div
              className={`pointer-events-none absolute z-20 -translate-x-1/2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-xl dark:border-purple-500/30 dark:bg-[#15101f] ${tooltipAbove ? '-translate-y-full' : ''}`}
              style={{ left: `${(hp.x / W) * 100}%`, top: `${(hp.y / H) * 100}%`, marginTop: tooltipAbove ? -14 : 14 }}
            >
              <div className="font-bold text-slate-900 dark:text-white">{data[hover].label}</div>
              <div className="font-semibold text-purple-600 dark:text-purple-300">{data[hover].value} {unit}</div>
            </div>
          )}
        </div>
      </div>
      <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500 sm:hidden">Swipe sideways to see the whole chart</p>
    </div>
  );
}