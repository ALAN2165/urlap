// frontend/src/components/layout/Logo.tsx
'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export default function Logo() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const src = mounted && resolvedTheme === 'dark' ? '/logo-dark.png' : '/logo.png';

  return (
    <div style={{ height: '32px', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
      <img
        src={src}
        alt="urlap"
        style={{ height: '32px', width: 'auto', maxWidth: '140px', objectFit: 'contain', display: 'block' }}
        onError={(e) => {
          (e.target as HTMLImageElement).src = '/logo.png';
          (e.target as HTMLImageElement).classList.add('dark:invert', 'dark:brightness-90');
        }}
      />
    </div>
  );
}