'use client';

import { useMemo } from 'react';
import { wavePath, waveLine } from './waveUtils';

interface WaveProps {
  amp: number;
  wavelength: number;
  fromX: number;
  toX: number;
  bottom: number;
  fill: string;
  fillOpacity?: number;
  topStroke?: string;
  topStrokeOpacity?: number;
  strokeWidth?: number;
  duration: number;
  reverse?: boolean;
  bob?: number;
  bobDuration?: number;
  animated?: boolean;
}

const SPLINE = '0.45 0 0.55 1; 0.45 0 0.55 1';

/** One drifting, bobbing liquid surface. Draw it inside a <g transform="translate(0 surfaceY)">. */
export default function Wave({
  amp, wavelength, fromX, toX, bottom, fill, fillOpacity = 1,
  topStroke, topStrokeOpacity = 0.3, strokeWidth = 1,
  duration, reverse = false, bob = 0, bobDuration = 4, animated = true,
}: WaveProps) {
  const span = wavelength * 2; // extra coverage so the drift never reveals an edge
  const body = useMemo(() => wavePath(amp, wavelength, fromX - span, toX + span, bottom), [amp, wavelength, fromX, toX, bottom, span]);
  const line = useMemo(() => waveLine(amp, wavelength, fromX - span, toX + span), [amp, wavelength, fromX, toX, span]);

  return (
    <g>
      {animated && bob > 0 && (
        <animateTransform
          attributeName="transform" type="translate"
          values={`0 0; 0 ${-bob}; 0 0`} keyTimes="0;0.5;1" calcMode="spline" keySplines={SPLINE}
          dur={`${bobDuration}s`} repeatCount="indefinite"
        />
      )}
      <g>
        {animated && (
          <animateTransform
            attributeName="transform" type="translate"
            from={reverse ? `${-wavelength} 0` : '0 0'}
            to={reverse ? '0 0' : `${-wavelength} 0`}
            dur={`${duration}s`} repeatCount="indefinite"
          />
        )}
        <path d={body} fill={fill} fillOpacity={fillOpacity} />
        {topStroke && (
          <path d={line} fill="none" stroke={topStroke} strokeOpacity={topStrokeOpacity} strokeWidth={strokeWidth} strokeLinecap="round" />
        )}
      </g>
    </g>
  );
}