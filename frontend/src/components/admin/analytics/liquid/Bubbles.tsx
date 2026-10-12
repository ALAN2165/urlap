'use client';

import { pseudoRandom } from './waveUtils';
import { LIQUID } from './palette';

interface BubblesProps {
  count: number;
  xMin: number;
  xMax: number;
  /** How far (in SVG units) bubbles rise from where they spawn up to the surface at y=4. */
  rise: number;
  seed?: number;
  animated?: boolean;
  color?: string;
  opacity?: number;
}

/** Rising, swaying bubbles. Render inside a group whose origin is the liquid surface,
 *  wrapped in a clipPath that hides everything above y=2 (so bubbles never leave the liquid). */
export default function Bubbles({ count, xMin, xMax, rise, seed = 1, animated = true, color = LIQUID.shine, opacity = 0.32 }: BubblesProps) {
  if (!animated || rise <= 8) return null;

  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const x = xMin + pseudoRandom(i + seed, 1) * (xMax - xMin);
        const r = 0.9 + pseudoRandom(i + seed, 2) * 1.6;
        const dur = 3.6 + pseudoRandom(i + seed, 3) * 3.8;
        const begin = -pseudoRandom(i + seed, 4) * dur;
        const sway = 1 + pseudoRandom(i + seed, 5) * 2;
        const d = `${dur.toFixed(2)}s`;
        const b = `${begin.toFixed(2)}s`;
        return (
          <circle key={i} cx={x.toFixed(2)} cy={rise} r={r.toFixed(2)} fill={color} fillOpacity={opacity}>
            <animate attributeName="cy" from={rise} to={4} dur={d} begin={b} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.15;0.8;1" dur={d} begin={b} repeatCount="indefinite" />
            <animate
              attributeName="cx"
              values={`${x.toFixed(2)};${(x + sway).toFixed(2)};${(x - sway).toFixed(2)};${x.toFixed(2)}`}
              dur={d} begin={b} repeatCount="indefinite"
            />
          </circle>
        );
      })}
    </g>
  );
}