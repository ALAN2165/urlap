'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import Image from 'next/image';
import { useExtra } from '@/i18n/extra';

/** A refined, glowing "Crafted by" credit badge with premium effects. */
export default function CreatorBadge() {
  const x = useExtra();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      title={x('creatorRole')}
      className="group relative mx-auto w-fit"
    >
      {/* هالة وتوهج خلفي ديناميكي ينبض ويثير إعجاب العين عند الهوفر */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-1.5 rounded-full bg-gradient-to-r from-purple-600/50 via-fuchsia-500/60 to-amber-400/50 opacity-30 blur-xl transition-all duration-700 group-hover:opacity-100 group-hover:blur-2xl group-hover:scale-105"
      />
      
      {/* الحاوية الأساسية مع حدود متدرجة وتأثير زجاجي أنيق */}
      <div className="relative flex items-center gap-3 rounded-full border border-purple-500/30 bg-slate-900/90 py-2 pe-4 ps-2 shadow-xl backdrop-blur-xl transition-all duration-300 group-hover:border-purple-400/80 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] dark:border-white/15 dark:bg-slate-900/85">
        
        {/* إطار الصورة مع حلقة متوهجة وخفيفة */}
        <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-full ring-2 ring-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.5)] transition-transform duration-300 group-hover:scale-105">
          <Image
            src="/me.png"
            alt={x('creatorName')}
            fill
            className="object-cover"
          />
        </div>

        {/* النصوص بشكل منسق واحترافي */}
        <span className="flex flex-col leading-tight">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-purple-300/90 rtl:normal-case rtl:tracking-normal">{x('craftedBy')}</span>
          <span className="text-sm font-bold text-white tracking-wide">{x('creatorName')}</span>
        </span>

        {/* أيقونة تفاعلية بحركة ناعمة */}
        <Sparkles size={14} className="text-amber-400 transition-transform duration-500 group-hover:rotate-45 group-hover:scale-125" />
      </div>
    </motion.div>
  );
}