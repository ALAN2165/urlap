/** Closed wave shape: wavy top edge at y=0, filled down to `bottom`.
 *  Pattern repeats every `wavelength`, so translating by exactly one
 *  wavelength loops seamlessly. */
export function wavePath(amp: number, wavelength: number, fromX: number, toX: number, bottom: number): string {
  const half = wavelength / 2;
  let d = `M ${fromX} 0`;
  let x = fromX;
  let up = true;
  while (x < toX - 0.001) {
    const ex = x + half;
    d += ` Q ${(x + half / 2).toFixed(2)} ${(up ? -amp * 2 : amp * 2).toFixed(2)} ${ex.toFixed(2)} 0`;
    x = ex;
    up = !up;
  }
  return `${d} L ${x.toFixed(2)} ${bottom} L ${fromX} ${bottom} Z`;
}

/** Just the wavy surface line (for the bright highlight on top of the liquid). */
export function waveLine(amp: number, wavelength: number, fromX: number, toX: number): string {
  const half = wavelength / 2;
  let d = `M ${fromX} 0`;
  let x = fromX;
  let up = true;
  while (x < toX - 0.001) {
    const ex = x + half;
    d += ` Q ${(x + half / 2).toFixed(2)} ${(up ? -amp * 2 : amp * 2).toFixed(2)} ${ex.toFixed(2)} 0`;
    x = ex;
    up = !up;
  }
  return d;
}

/** Deterministic 0..1 value so server and client render identical bubbles. */
export function pseudoRandom(i: number, k: number): number {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
}