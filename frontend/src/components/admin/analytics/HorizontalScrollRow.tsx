'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

export default function HorizontalScrollRow({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showHint, setShowHint] = useState(true);

  function handleScroll() {
    if (scrollRef.current && scrollRef.current.scrollLeft > 24) setShowHint(false);
  }

  return (
    <div className="relative">
      <div ref={scrollRef} onScroll={handleScroll} className="scroll-thin flex gap-5 overflow-x-auto pb-3 pr-6 snap-x snap-mandatory scroll-smooth">
        {children}
      </div>
      {showHint && (
        <motion.div
          className="pointer-events-none absolute bottom-1/2 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/90 text-white shadow-lg"
          animate={{ x: [0, 6, 0], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronRight size={16} />
        </motion.div>
      )}
    </div>
  );
}