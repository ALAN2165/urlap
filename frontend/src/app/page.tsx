'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { ArrowRight, Braces, Code2, Database, Layers, Server, Sparkles, Terminal, Trophy, Zap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const FLOATING_ICONS = [
  { Icon: Database, pos: 'left-[4%] top-[10%]', delay: 0, duration: 5.5, tint: 'text-teal-500' },
  { Icon: Terminal, pos: 'right-[6%] top-[8%]', delay: 0.8, duration: 6.5, tint: 'text-purple-500' },
  { Icon: Server, pos: 'left-[12%] bottom-[8%]', delay: 1.4, duration: 6, tint: 'text-purple-500' },
  { Icon: Layers, pos: 'right-[12%] bottom-[10%]', delay: 0.4, duration: 5, tint: 'text-teal-500' },
  { Icon: Braces, pos: 'left-[28%] top-[0%]', delay: 1.1, duration: 7, tint: 'text-teal-500' },
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
const fadeUp = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' as const } },
};

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
    <section className="relative flex min-h-[calc(100vh-6rem)] flex-col items-center justify-center overflow-hidden px-6 py-10 text-center">
      {/* Hero visual: massive glowing logo + floating tech stack */}
      <div className="relative mb-8 flex h-[400px] w-full max-w-4xl items-center justify-center md:h-[440px]">
        {FLOATING_ICONS.map(({ Icon, pos, delay, duration, tint }, i) => (
          <Floater key={i} pos={pos} delay={delay} duration={duration}>
            <div className="glass rounded-2xl p-3.5">
              <Icon size={26} className={tint} />
            </div>
          </Floater>
        ))}
        {KEYWORDS.map(({ text, pos, delay, duration }) => (
          <Floater key={text} pos={pos} delay={delay} duration={duration}>
            <div className="glass rounded-xl px-3.5 py-2 font-mono text-xs font-bold text-slate-700 dark:text-slate-200">
              <span className="text-teal-500">›</span> {text}
            </div>
          </Floater>
        ))}

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="relative flex items-center justify-center"
          style={{ width: 320, height: 320 }}
        >
          {/* rotating conic glow */}
          <motion.div
            className="absolute rounded-full opacity-50 blur-3xl dark:opacity-60"
            style={{ inset: -30, background: 'conic-gradient(from 0deg, #14b8a6, #9333ea, #14b8a6)' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
          />
          {/* expanding pulse rings */}
          {[0, 1].map((i) => (
            <motion.span
              key={i}
              className="absolute inset-0 rounded-full border-2 border-teal-400/40"
              animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
              transition={{ duration: 3, repeat: Infinity, delay: i * 1.5, ease: 'easeOut' }}
            />
          ))}
          {/* the orb */}
          <motion.div
            animate={{ y: [-10, 10, -10] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="relative flex h-full w-full items-center justify-center rounded-full border border-teal-300/50 bg-white/80 shadow-[0_0_80px_rgba(20,184,166,0.35)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/5"
          >
            <img src="/logo.png" alt="urlap" style={{ height: 170, width: 'auto' }} className="object-contain" />
          </motion.div>
        </motion.div>
      </div>

      <motion.div variants={stagger} initial="initial" animate="animate" className="flex flex-col items-center">
        <motion.h1 variants={fadeUp} className="mb-5 text-5xl font-extrabold leading-[1.05] tracking-tight text-slate-900 dark:text-white md:text-7xl">
          {t('titleLine1')}
          <br />
          <span className="bg-gradient-to-r from-teal-500 to-purple-600 bg-clip-text text-transparent">{t('titleLine2')}</span>
        </motion.h1>

        <motion.p variants={fadeUp} className="mb-10 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-400 md:text-xl">
          {t('subtitle')}
        </motion.p>

        <motion.div variants={fadeUp} className="mb-16 flex flex-wrap items-center justify-center gap-4">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
            <Link
              href={user ? '/challenges' : '/register'}
              className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-gradient-to-r from-teal-500 to-purple-600 px-9 py-4 font-bold text-white shadow-[0_0_30px_rgba(20,184,166,0.35)] transition-shadow duration-300 hover:shadow-[0_0_50px_rgba(20,184,166,0.6)]"
            >
              <span className="relative z-10">{user ? t('ctaContinue') : t('ctaStart')}</span>
              <ArrowRight size={18} className="relative z-10 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
              {/* sweep highlight */}
              <span className="pointer-events-none absolute inset-y-0 -left-full w-1/2 -skew-x-12 bg-white/35 blur-sm transition-transform duration-700 ease-out group-hover:translate-x-[400%]" />
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
            <Link href={user ? '/dashboard' : '/login'} className="glass inline-block rounded-full px-9 py-4 font-bold text-slate-900 dark:text-white">
              {user ? tn('dashboard') : tn('login')}
            </Link>
          </motion.div>
        </motion.div>

        <div className="grid w-full max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">
          {features.map((f) => (
            <motion.div key={f.title} variants={fadeUp} whileHover={{ y: -8 }} className="glass rounded-3xl p-6 text-start">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-purple-600 shadow-[0_0_20px_rgba(20,184,166,0.3)]">
                <f.icon size={20} className="text-white" />
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