'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { ArrowRight, Braces, Code2, Database, Layers, Server, Sparkles, Terminal, Trophy, Zap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const FLOATING_ICONS = [
  { Icon: Database, pos: 'left-[4%] top-[10%]', delay: 0, duration: 5.5 },
  { Icon: Terminal, pos: 'right-[6%] top-[8%]', delay: 0.8, duration: 6.5 },
  { Icon: Server, pos: 'left-[12%] bottom-[8%]', delay: 1.4, duration: 6 },
  { Icon: Layers, pos: 'right-[12%] bottom-[10%]', delay: 0.4, duration: 5 },
  { Icon: Braces, pos: 'left-[28%] top-[0%]', delay: 1.1, duration: 7 },
];

const KEYWORDS = [
  { text: 'SELECT', pos: 'left-[0%] top-[44%]', delay: 0.3, duration: 6 },
  { text: 'JOIN', pos: 'right-[1%] top-[42%]', delay: 1.2, duration: 5.5 },
  { text: 'WHERE', pos: 'right-[27%] top-[-2%]', delay: 0.9, duration: 6.5 },
  { text: 'GROUP BY', pos: 'left-[24%] bottom-[0%]', delay: 1.6, duration: 5 },
];

function Floater({ pos, delay, duration, children }: { pos: string; delay: number; duration: number; children: React.ReactNode }) {
  return (
    <motion.div
      className={`absolute hidden md:flex ${pos}`}
      animate={{ y: [0, -16, 0], rotate: [-4, 4, -4] }}
      transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  );
}

const stagger = { animate: { transition: { staggerChildren: 0.12, delayChildren: 0.5 } } };
const fadeUp = { initial: { opacity: 0, y: 40 }, animate: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' } } };

export default function HomePage() {
  const t = useTranslations('home');
  const tn = useTranslations('nav');
  const { user } = useAuth();

  const features = [
    { icon: Code2, title: t('feature1Title'), desc: t('feature1Desc') },
    { icon: Zap, title: t('feature2Title'), desc: t('feature2Desc') },
    { icon: Trophy, title: t('feature3Title'), desc: t('feature3Desc') },
  ];

  return (
    <section className="relative flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center overflow-hidden px-4 py-8 text-center sm:px-6 md:min-h-[calc(100vh-6rem)] md:py-10">
      <div className="relative mb-6 flex h-[260px] w-full max-w-4xl items-center justify-center sm:h-[320px] md:mb-8 md:h-[400px] lg:h-[440px]">
        {FLOATING_ICONS.map(({ Icon, pos, delay, duration }, i) => (
          <Floater key={i} pos={pos} delay={delay} duration={duration}>
            <div className="glass rounded-2xl p-3.5">
              <Icon size={26} className="text-purple-400" />
            </div>
          </Floater>
        ))}
        {KEYWORDS.map(({ text, pos, delay, duration }) => (
          <Floater key={text} pos={pos} delay={delay} duration={duration}>
            <div className="glass rounded-xl px-3.5 py-2 font-mono text-xs font-bold text-slate-700 dark:text-slate-200">
              <span className="text-purple-400">›</span> {text}
            </div>
          </Floater>
        ))}

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="relative flex h-[180px] w-[180px] items-center justify-center sm:h-[240px] sm:w-[240px] md:h-[300px] md:w-[300px] lg:h-[320px] lg:w-[320px]"
        >
          <motion.div
            className="absolute rounded-full opacity-40 blur-3xl dark:opacity-50"
            style={{ inset: -30, background: 'conic-gradient(from 0deg, #9333ea, #c084fc, #6b21a8, #9333ea)' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
          />
          {[0, 1].map((i) => (
            <motion.span
              key={i}
              className="absolute inset-0 rounded-full border-2 border-purple-400/30"
              animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
              transition={{ duration: 3, repeat: Infinity, delay: i * 1.5, ease: 'easeOut' }}
            />
          ))}
          <motion.div
            animate={{ y: [-10, 10, -10] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="relative flex h-full w-full items-center justify-center rounded-full border border-purple-300/40 bg-white/80 shadow-[0_0_60px_rgba(147,51,234,0.3)] backdrop-blur-2xl dark:border-purple-400/10 dark:bg-slate-800/50"
          >
            <img src="/logo.png" alt="urlap" className="h-[90px] w-auto object-contain sm:h-[120px] md:h-[150px] lg:h-[170px]" />
          </motion.div>
        </motion.div>
      </div>

      <motion.div variants={stagger} initial="initial" animate="animate" className="flex w-full flex-col items-center">
        <motion.div variants={fadeUp} className="glass mb-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 md:mb-6">
          <Sparkles size={14} className="text-purple-400" />
          {t('badge')}
        </motion.div>

        <motion.h1 variants={fadeUp} className="mb-4 text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 dark:text-white sm:text-5xl md:mb-5 md:text-7xl">
          {t('titleLine1')}
          <br />
          <span className="bg-gradient-to-r from-purple-500 to-purple-700 bg-clip-text text-transparent">{t('titleLine2')}</span>
        </motion.h1>

        <motion.p variants={fadeUp} className="mb-8 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-400 sm:text-lg md:mb-10 md:text-xl">
          {t('subtitle')}
        </motion.p>

        <motion.div variants={fadeUp} className="mb-12 flex w-full flex-col items-center gap-3 xs:w-auto xs:flex-row xs:flex-wrap xs:justify-center xs:gap-4 md:mb-16">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="w-full xs:w-auto">
            <Link
              href={user ? '/challenges' : '/register'}
              className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-full bg-gradient-to-r from-purple-600 to-purple-800 px-8 py-3.5 font-bold text-white shadow-[0_0_25px_rgba(147,51,234,0.3)] transition-shadow duration-300 hover:shadow-[0_0_40px_rgba(147,51,234,0.55)] sm:px-9 sm:py-4"
            >
              <span className="relative z-10">{user ? t('ctaContinue') : t('ctaStart')}</span>
              <ArrowRight size={18} className="relative z-10 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
              <span className="pointer-events-none absolute inset-y-0 -left-full w-1/2 -skew-x-12 bg-white/25 blur-sm transition-transform duration-700 ease-out group-hover:translate-x-[400%]" />
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="w-full xs:w-auto">
            <Link href={user ? '/dashboard' : '/login'} className="glass flex w-full items-center justify-center rounded-full px-8 py-3.5 font-bold text-slate-900 dark:text-white sm:px-9 sm:py-4">
              {user ? tn('dashboard') : tn('login')}
            </Link>
          </motion.div>
        </motion.div>

        <div className="grid w-full max-w-4xl grid-cols-1 gap-5 sm:grid-cols-3 md:gap-6">
          {features.map((f) => (
            <motion.div key={f.title} variants={fadeUp} whileHover={{ y: -8 }} className="glass rounded-3xl p-5 text-start sm:p-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-500/10">
                <f.icon size={20} className="text-purple-400" />
              </div>
              <div className="mb-1 text-base font-bold text-slate-900 dark:text-white">{f.title}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">{f.desc}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}