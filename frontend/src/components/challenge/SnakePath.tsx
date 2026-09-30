'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { PathChallenge } from '@/types';

const CARD_W = 260;
const H_WIRE_W = 64;
const V_WIRE_W = 32;
const V_OFFSET = CARD_W / 2 - V_WIRE_W / 2;

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

function Wire({ state, direction }: { state: WireState; direction: 'right' | 'left' | 'down' }) {
  const vertical = direction === 'down';
  const color = WIRE_COLOR[state];
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

export default function SnakePath({ labSlug, challenges }: { labSlug: string; challenges: PathChallenge[] }) {
  const rows: PathChallenge[][] = [];
  for (let i = 0; i < challenges.length; i += 3) rows.push(challenges.slice(i, i + 3));

  return (
    <div dir="ltr" className="mx-auto flex w-fit flex-col">
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
                    <ChallengeNode labSlug={labSlug} challenge={c} index={gi} />
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