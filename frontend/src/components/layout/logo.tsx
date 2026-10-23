// frontend/src/components/layout/Logo.tsx
'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

interface LogoProps {
  size?: number; // تقدر تمرر الحجم اللي عايزه بالبيكسل
}

export default function Logo({ size = 80 }: LogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const src = mounted && resolvedTheme === 'dark' ? '/logo-dark.png' : '/logo.png';

  return (
    <div style={{ height: `${size}px`, display: 'flex', alignItems: 'center' }}>
      <img
        src={src}
        alt="urlap"
        style={{
          height: `${size}px`,
          width: `${size}px`,
          maxWidth: 'none',
          objectFit: 'contain',
          display: 'block',
        }}
        onError={(e) => {
          (e.target as HTMLImageElement).src = '/logo.png';
          (e.target as HTMLImageElement).classList.add('dark:invert', 'dark:brightness-90');
        }}
      />
    </div>
  );
}