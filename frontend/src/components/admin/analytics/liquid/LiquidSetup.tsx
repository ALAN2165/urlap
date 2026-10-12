'use client';

/** Mount ONCE per dashboard. Provides:
 *  - the SVG "goo" filter (#liquid-goo) that melts droplets into the liquid body
 *  - the CSS keyframes used by the liquid bars and the ambient card glow */
const CSS = `
@keyframes liquid-flow { from { background-position: 0 0, 0 0; } to { background-position: 180px 0, 0 0; } }
@keyframes liquid-drop-a { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(9px, -3px) scale(0.62); } }
@keyframes liquid-drop-b { 0%, 100% { transform: translate(0, 0) scale(0.8); } 50% { transform: translate(15px, 4px) scale(1.15); } }
@keyframes liquid-drop-c { 0%, 100% { transform: translate(0, 0) scale(0.6); } 50% { transform: translate(7px, -5px) scale(1); } }
@keyframes liquid-float { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(-18px, 14px) scale(1.12); } }
.liquid-body { background-repeat: repeat-x, no-repeat; background-size: 180px 100%, 100% 100%; animation: liquid-flow 3.4s linear infinite; }
.liquid-drop-a { animation: liquid-drop-a 3.1s ease-in-out infinite; }
.liquid-drop-b { animation: liquid-drop-b 4.2s ease-in-out infinite; }
.liquid-drop-c { animation: liquid-drop-c 3.6s ease-in-out infinite; }
.liquid-blob { animation: liquid-float 9s ease-in-out infinite; }
.liquid-paused * { animation-play-state: paused !important; }
@media (prefers-reduced-motion: reduce) {
  .liquid-body, .liquid-drop-a, .liquid-drop-b, .liquid-drop-c, .liquid-blob { animation: none; }
}
`;

export default function LiquidSetup() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute', pointerEvents: 'none' }}>
        <defs>
          <filter id="liquid-goo" x="-5%" y="-40%" width="110%" height="180%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -9" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>
    </>
  );
}