/** One place to tune the look of every liquid. Keep these as 6-digit hex values: the bar and gauge
 *  code appends alpha digits to them (e.g. `${color}99`). */
export const LIQUID = {
  sage: '#6fb89d',
  lavender: '#9b8ad8',
  coral: '#d98a8a',
  peach: '#d9996f',
  amber: '#d6b36a',
  rose: '#c98fb0',
  iris: '#9d90c9',
  /** Highlights use a tinted off-white instead of pure #fff, so shine reads as soft light, not glare. */
  shine: '#e8e4f4',
} as const;

export const STATUS_COLORS: Record<string, string> = {
  ACCEPTED: LIQUID.sage,
  WRONG_ANSWER: LIQUID.coral,
  RUNTIME_ERROR: LIQUID.peach,
  TIME_LIMIT_EXCEEDED: LIQUID.amber,
  COMPILE_ERROR: LIQUID.rose,
  MEMORY_LIMIT_EXCEEDED: LIQUID.iris,
};