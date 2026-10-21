'use client';

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Crown, Flame, Lock } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { PathChallenge } from '@/types';
import { useExtra } from '@/i18n/extra';
import { AuraFrame, EmberField } from './BossAura';

const CARD_W = 260;
const H_WIRE_W = 64;
const V_WIRE_W = 32;
const V_OFFSET = CARD_W / 2 - V_WIRE_W / 2;
const SNAKE_W = CARD_W * 3 + H_WIRE_W * 2;
const BOSS_COLOR = '#f43f5e';

type WireState = 'done' | 'active' | 'future';

function wireState(next: PathChallenge): WireState {
  if (next.solved) return 'done';
  if (!next.locked) return 'active';
  return 'future';
}

const WIRE_COLOR: Record<WireState, string> = {
  done: '#10b981',
  active: '#a855f7',
  future: '#64748b',
};

function Wire({ state, direction, color: colorOverride }: { state: WireState; direction: 'right' | 'left' | 'down'; color?: string }) {
  const vertical = direction === 'down';
  const color = colorOverride ?? WIRE_COLOR[state];
  const width = vertical ? V_WIRE_W : H_WIRE_W;
  const height = vertical ? H_WIRE_W : V_WIRE_W;

  return (
    <div
      className="relative flex flex-shrink-0 items-center justify-center"
      style={{ width, height, transform: direction === 'left' ? 'scaleX(-1)' : undefined }}
    >
      <div
        className="absolute rounded-full"
        style={{
          ...(vertical ? { width: 5, height: '100%' } : { height: 5, width: '100%' }),
          background: state === 'future' ? `repeating-linear-gradient(45deg, ${color}66 0 4px, transparent 4px 8px)` : color,
          opacity: state === 'future' ? 0.55 : state === 'done' ? 0.9 : 0.3,
        }}
      />

      {state === 'active' &&
        [0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute h-[7px] w-[7px] rounded-full"
            style={{
              backgroundColor: color,
              boxShadow: `0 0 8px 2px ${color}`,
              ...(vertical ? { left: '50%', marginLeft: -3.5 } : { top: '50%', marginTop: -3.5 }),
            }}
            animate={vertical ? { top: ['-4%', '104%'], opacity: [0, 1, 1, 0] } : { left: ['-4%', '104%'], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'linear', delay: i * 0.35 }}
          />
        ))}

      {state === 'done' && (
        <motion.span
          className="absolute h-2.5 w-2.5 rounded-full"
          style={{ left: '50%', top: '50%', marginLeft: -5, marginTop: -5, backgroundColor: color, boxShadow: `0 0 10px 3px ${color}` }}
          animate={{ opacity: [0.5, 1, 0.5], scale: [0.85, 1.2, 0.85] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      <span
        className={`absolute h-2.5 w-2.5 rotate-45 rounded-[2px] border ${vertical ? 'left-1/2 top-0 -translate-x-1/2 -translate-y-1/2' : 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2'}`}
        style={{ borderColor: color, backgroundColor: state === 'future' ? 'transparent' : color, opacity: state === 'future' ? 0.45 : 1, boxShadow: state === 'future' ? undefined : `0 0 6px ${color}` }}
      />
      <span
        className={`absolute h-2.5 w-2.5 rotate-45 rounded-[2px] border ${vertical ? 'left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2' : 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2'}`}
        style={{ borderColor: color, backgroundColor: state === 'future' ? 'transparent' : color, opacity: state === 'future' ? 0.45 : 1, boxShadow: state === 'future' ? undefined : `0 0 6px ${color}` }}
      />
    </div>
  );
}

const DIFFICULTY_STYLES: Record<string, string> = {
  EASY: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20',
  MEDIUM: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20',
  HARD: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-500/20',
  EXPERT: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20',
};

function ChallengeNode({ labSlug, challenge, index }: { labSlug: string; challenge: PathChallenge; index: number }) {
  const t = useTranslations('challenge');
  const locale = useLocale();
  const isLocked = challenge.locked;
  const isDone = challenge.solved;
  const isActive = !isLocked && !isDone;

  const difficultyLabel =
    challenge.difficulty === 'EASY' ? t('difficultyEasy')
    : challenge.difficulty === 'MEDIUM' ? t('difficultyMedium')
    : challenge.difficulty === 'HARD' ? t('difficultyHard')
    : t('difficultyExpert');

  const numberDisplay = String(index + 1).padStart(2, '0');

  // Locked cards now carry stronger backdrop-blur PLUS a blurred content
  // layer underneath the sharp lock icon, so the "behind frosted glass"
  // effect reads clearly rather than just being slightly translucent.
  const surface = isLocked
    ? 'border border-slate-200/70 bg-white/40 backdrop-blur-lg dark:border-slate-700/40 dark:bg-slate-800/20'
    : isDone
      ? 'border border-slate-200 border-l-4 border-l-emerald-500 bg-emerald-50/60 dark:border-slate-700/40 dark:border-l-emerald-500 dark:bg-emerald-900/10'
      : 'border border-purple-400/50 bg-white dark:bg-slate-800/40';

  const cardBody = (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0, scale: isActive ? [1.05, 1.07, 1.05] : 1 }}
      transition={
        isActive
          ? { opacity: { duration: 0.5, delay: index * 0.06 }, y: { duration: 0.5, delay: index * 0.06 }, scale: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } }
          : { duration: 0.5, delay: index * 0.06 }
      }
      whileHover={!isLocked ? { y: -8, rotate: isDone ? 0 : -0.6 } : undefined}
      whileTap={!isLocked ? { scale: 0.97 } : undefined}
      style={{ width: CARD_W, minHeight: 168 }}
      className={`relative overflow-hidden rounded-3xl p-6 transition-colors duration-300 ${surface}`}
    >
      {isActive && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute -inset-[2px] rounded-[26px] border-2 border-purple-400/70"
          animate={{ opacity: [0.3, 0.9, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {isLocked && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/10"
          initial={{ x: '-150%' }}
          animate={{ x: '350%' }}
          transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 3.5, ease: 'easeInOut' }}
        />
      )}

      <span
        aria-hidden
        className={`pointer-events-none absolute -bottom-3 select-none text-7xl font-black leading-none ${
          locale === 'ar' ? '-left-1' : '-right-1'
        } ${isLocked ? 'text-slate-400/20' : isDone ? 'text-emerald-500/10' : 'text-purple-500/10'}`}
      >
        {numberDisplay}
      </span>

      {/* Content is genuinely blurred (not just translucent) when locked */}
      <div
        dir={locale === 'ar' ? 'rtl' : 'ltr'}
        className={`relative z-10 transition-[filter] duration-300 ${isLocked ? 'blur-[2.5px] select-none' : ''}`}
      >
        <span className={`inline-block rounded-full px-3 py-1 text-[11px] font-bold ${DIFFICULTY_STYLES[challenge.difficulty]}`}>
          {difficultyLabel}
        </span>
        <h3 className={`mb-1 mt-3 text-lg font-bold leading-snug ${isLocked ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>
          {locale === 'ar' ? challenge.titleAr : challenge.titleEn}
        </h3>
        <div className={`text-sm font-bold ${isLocked ? 'text-slate-400 dark:text-slate-600' : 'text-purple-600 dark:text-purple-400'}`}>
          {challenge.points} {t('pts')}
        </div>
      </div>

      {/* The lock icon sits ABOVE the blur layer, so it stays crisp */}
      {isLocked && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/70 shadow-lg backdrop-blur-sm dark:bg-slate-900/60">
            <Lock size={20} className="text-slate-500 dark:text-slate-300" />
          </div>
        </div>
      )}
    </motion.div>
  );

  return (
    <div className="relative" style={{ width: CARD_W }}>
      {isActive && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -inset-6 -z-10 rounded-full blur-2xl"
          style={{ background: 'conic-gradient(from 0deg, #a855f7, #7e22ce, #c084fc, #a855f7)' }}
          animate={{ rotate: 360, opacity: [0.35, 0.55, 0.35] }}
          transition={{ rotate: { duration: 9, repeat: Infinity, ease: 'linear' }, opacity: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } }}
        />
      )}
      {isLocked ? cardBody : <Link href={`/challenges/${labSlug}/${challenge.slug}`} className="block">{cardBody}</Link>}
    </div>
  );
}

/** The S-shaped path itself (rows of 3, snaking back and forth). `offset` keeps the numbering continuous. */
function Snake({ labSlug, challenges, offset }: { labSlug: string; challenges: PathChallenge[]; offset: number }) {
  const rows: PathChallenge[][] = [];
  for (let i = 0; i < challenges.length; i += 3) rows.push(challenges.slice(i, i + 3));

  return (
    <div className="flex flex-col">
      {rows.map((row, rowIdx) => {
        const reversed = rowIdx % 2 === 1;
        const display = reversed ? [...row].reverse() : row;
        const lastInRow = challenges.indexOf(row[row.length - 1]);

        return (
          <div key={rowIdx}>
            <div className={`flex items-center ${reversed ? 'justify-end' : 'justify-start'}`}>
              {display.map((c, i) => {
                const gi = challenges.indexOf(c);
                const following = display[i + 1];
                return (
                  <Fragment key={c.id}>
                    <ChallengeNode labSlug={labSlug} challenge={c} index={gi + offset} />
                    {following && (
                      <Wire
                        state={wireState(challenges[Math.max(gi, challenges.indexOf(following))])}
                        direction={reversed ? 'left' : 'right'}
                      />
                    )}
                  </Fragment>
                );
              })}
            </div>

            {rowIdx < rows.length - 1 && (
              <div
                className={`flex py-1 ${reversed ? 'justify-start' : 'justify-end'}`}
                style={reversed ? { paddingLeft: V_OFFSET } : { paddingRight: V_OFFSET }}
              >
                <Wire state={wireState(challenges[lastInRow + 1])} direction="down" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Horizontal centre of the last node of a snake with `count` challenges (so the boss wire can drop straight from it). */
function lastNodeCenterX(count: number): number {
  const rowIdx = Math.floor((count - 1) / 3);
  const reversed = rowIdx % 2 === 1;
  const inLastRow = count - rowIdx * 3;
  const slot = reversed ? 3 - inLastRow : inLastRow - 1;
  return slot * (CARD_W + H_WIRE_W) + CARD_W / 2;
}

/** The hidden Master Challenge: a crimson wire from the last node into a prestige banner. */
function BossGate({ labSlug, boss, connectorX }: { labSlug: string; boss: PathChallenge; connectorX: number }) {
  const t = useTranslations('challenge');
  const x = useExtra();
  const locale = useLocale();
  const reduce = useReducedMotion();
  const [reveal, setReveal] = useState(false);

  // The dramatic "it appears" intro plays once per student per boss.
  useEffect(() => {
    const key = `urlap:boss-seen:${boss.id}`;
    let seen = true;
    try { seen = localStorage.getItem(key) === '1'; } catch { /* storage unavailable */ }
    if (seen) return;
    setReveal(true);
    const id = setTimeout(() => {
      setReveal(false);
      try { localStorage.setItem(key, '1'); } catch { /* ignore */ }
    }, reduce ? 800 : 3400);
    return () => clearTimeout(id);
  }, [boss.id, reduce]);

  const difficultyLabel =
    boss.difficulty === 'EASY' ? t('difficultyEasy')
    : boss.difficulty === 'MEDIUM' ? t('difficultyMedium')
    : boss.difficulty === 'HARD' ? t('difficultyHard')
    : t('difficultyExpert');
  const title = locale === 'ar' ? boss.titleAr : boss.titleEn;

  return (
    <div>
      <div className="flex py-1" style={{ paddingLeft: connectorX - V_WIRE_W / 2 }}>
        <Wire state={boss.solved ? 'done' : 'active'} direction="down" color={BOSS_COLOR} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        whileHover={{ y: -4 }}
        style={{ width: SNAKE_W }}
      >
        <Link href={`/challenges/${labSlug}/${boss.slug}`} className="block">
          <AuraFrame>
            <div dir={locale === 'ar' ? 'rtl' : 'ltr'} className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-[#1a0a14] to-slate-950 px-8 py-9">
              <EmberField />
              <motion.div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-0 h-56 w-[120%] -translate-x-1/2 rounded-full bg-rose-600/25 blur-3xl"
                animate={reduce ? undefined : { opacity: [0.5, 1, 0.5], scale: [1, 1.1, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              />

              <div className="relative z-10 flex items-center gap-8">
                <motion.div
                  animate={reduce ? undefined : { y: [0, -6, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 via-rose-500 to-purple-600 shadow-[0_0_50px_rgba(244,63,94,0.7)]"
                >
                  <Crown size={36} className="text-white" />
                </motion.div>

                <div className="min-w-0 flex-1 text-start">
                  <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.25em] text-amber-300">
                    <Flame size={12} /> {x('bossLabel')}
                  </span>
                  <h3 className="bg-gradient-to-r from-amber-300 via-rose-400 to-purple-400 bg-clip-text text-2xl font-black leading-tight text-transparent sm:text-3xl">{title}</h3>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm font-bold">
                    <span className="rounded-full bg-rose-500/15 px-3 py-0.5 text-rose-300">{difficultyLabel}</span>
                    <span className="text-amber-300">{boss.points} {t('pts')}</span>
                    {boss.solved && <span className="flex items-center gap-1 text-emerald-300"><CheckCircle2 size={15} /> {x('bossConquered')}</span>}
                  </div>
                </div>

                <span className="group hidden flex-shrink-0 items-center gap-2 rounded-full bg-gradient-to-r from-rose-600 via-red-600 to-amber-500 px-7 py-3 text-sm font-extrabold text-white shadow-[0_0_35px_rgba(244,63,94,0.6)] sm:inline-flex">
                  {x('bossCta')}
                  <ArrowRight size={16} className="rtl:rotate-180" />
                </span>
              </div>

              <AnimatePresence>
                {reveal && (
                  <motion.div
                    key="reveal"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.9 }}
                    className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black px-6 text-center"
                  >
                    <motion.span
                      aria-hidden
                      className="absolute h-40 w-40 rounded-full border-2 border-rose-500"
                      initial={{ scale: 0.2, opacity: 1 }}
                      animate={{ scale: 7, opacity: 0 }}
                      transition={{ duration: 2.2, ease: 'easeOut', repeat: Infinity }}
                    />
                    <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 120, damping: 12 }}>
                      <Crown size={48} className="mx-auto mb-3 text-amber-300" />
                    </motion.div>
                    <motion.h3 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="relative text-2xl font-black text-white sm:text-3xl">
                      {x('bossRevealTitle')}
                    </motion.h3>
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="relative mt-2 max-w-md text-sm text-rose-200">
                      {x('bossRevealBody')}
                    </motion.p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </AuraFrame>
        </Link>
      </motion.div>
    </div>
  );
}

export default function SnakePath({ labSlug, challenges }: { labSlug: string; challenges: PathChallenge[] }) {
  // The hidden Master Challenge arrives in the list only once the student has earned it.
  const boss = challenges.find((c) => c.isBoss) ?? null;
  const normal = challenges.filter((c) => !c.isBoss);
  const before = boss ? normal.filter((c) => c.orderIndex < boss.orderIndex) : normal;
  const after = boss ? normal.filter((c) => c.orderIndex > boss.orderIndex) : [];

  return (
    <div dir="ltr" className="mx-auto flex w-fit flex-col">
      <Snake labSlug={labSlug} challenges={before} offset={0} />
      {boss && <BossGate labSlug={labSlug} boss={boss} connectorX={lastNodeCenterX(before.length)} />}
      {after.length > 0 && (
        <div className="mt-10">
          <Snake labSlug={labSlug} challenges={after} offset={before.length + 1} />
        </div>
      )}
    </div>
  );
}