'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Lock, Crown, Flame, Sparkles } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { PathChallenge } from '@/types';

const CARD_W = 260;
const H_WIRE_W = 64;
const V_WIRE_W = 32;
const V_OFFSET = CARD_W / 2 - V_WIRE_W / 2;

type WireState = 'done' | 'active' | 'future' | 'master';

function wireState(next: PathChallenge, isMasterTarget: boolean): WireState {
  if (isMasterTarget && !next.locked) return 'master';
  if (next.solved) return 'done';
  if (!next.locked) return 'active';
  return 'future';
}

const WIRE_COLOR: Record<WireState, string> = {
  done: '#10b981',
  active: '#a855f7',
  future: '#64748b',
  master: '#f59e0b',
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
          background:
            state === 'future'
              ? `repeating-linear-gradient(45deg, ${color}66 0 4px, transparent 4px 8px)`
              : state === 'master'
                ? 'linear-gradient(90deg, #f59e0b, #ef4444, #a855f7)'
                : color,
          opacity: state === 'future' ? 0.55 : state === 'done' || state === 'master' ? 0.95 : 0.3,
          boxShadow: state === 'master' ? '0 0 14px rgba(245,158,11,0.75)' : undefined,
        }}
      />

      {(state === 'active' || state === 'master') &&
        [0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute h-[8px] w-[8px] rounded-full"
            style={{
              backgroundColor: state === 'master' ? '#fde047' : color,
              boxShadow:
                state === 'master'
                  ? '0 0 12px 4px #f59e0b, 0 0 20px 6px #ef4444'
                  : `0 0 8px 2px ${color}`,
              ...(vertical ? { left: '50%', marginLeft: -4 } : { top: '50%', marginTop: -4 }),
            }}
            animate={
              vertical
                ? { top: ['-4%', '104%'], opacity: [0, 1, 1, 0] }
                : { left: ['-4%', '104%'], opacity: [0, 1, 1, 0] }
            }
            transition={{
              duration: state === 'master' ? 0.75 : 1.1,
              repeat: Infinity,
              ease: 'linear',
              delay: i * (state === 'master' ? 0.24 : 0.35),
            }}
          />
        ))}

      {state === 'done' && (
        <motion.span
          className="absolute h-2.5 w-2.5 rounded-full"
          style={{
            left: '50%',
            top: '50%',
            marginLeft: -5,
            marginTop: -5,
            backgroundColor: color,
            boxShadow: `0 0 10px 3px ${color}`,
          }}
          animate={{ opacity: [0.5, 1, 0.5], scale: [0.85, 1.2, 0.85] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      <span
        className={`absolute h-2.5 w-2.5 rotate-45 rounded-[2px] border ${
          vertical
            ? 'left-1/2 top-0 -translate-x-1/2 -translate-y-1/2'
            : 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2'
        }`}
        style={{
          borderColor: color,
          backgroundColor: state === 'future' ? 'transparent' : color,
          opacity: state === 'future' ? 0.45 : 1,
          boxShadow: state === 'future' ? undefined : `0 0 6px ${color}`,
        }}
      />
      <span
        className={`absolute h-2.5 w-2.5 rotate-45 rounded-[2px] border ${
          vertical
            ? 'left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2'
            : 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2'
        }`}
        style={{
          borderColor: color,
          backgroundColor: state === 'future' ? 'transparent' : color,
          opacity: state === 'future' ? 0.45 : 1,
          boxShadow: state === 'future' ? undefined : `0 0 6px ${color}`,
        }}
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

function ChallengeNode({
  labSlug,
  challenge,
  index,
}: {
  labSlug: string;
  challenge: PathChallenge;
  index: number;
}) {
  const t = useTranslations('challenge');
  const locale = useLocale();
  const isMaster = index === 5;
  const isLocked = challenge.locked;
  const isDone = challenge.solved;
  const isActive = !isLocked && !isDone;

  const difficultyLabel =
    challenge.difficulty === 'EASY'
      ? t('difficultyEasy')
      : challenge.difficulty === 'MEDIUM'
        ? t('difficultyMedium')
        : challenge.difficulty === 'HARD'
          ? t('difficultyHard')
          : t('difficultyExpert');

  const numberDisplay = String(index + 1).padStart(2, '0');

  const surface = isMaster
    ? isDone
      ? 'border-2 border-amber-400/90 bg-gradient-to-br from-slate-950 via-emerald-950/90 to-amber-950/90 text-white shadow-[0_0_40px_rgba(245,158,11,0.45),inset_0_0_25px_rgba(16,185,129,0.25)]'
      : 'border-2 border-amber-400/90 bg-gradient-to-br from-[#0f051d] via-[#240722] to-[#3b0a18] text-white shadow-[0_0_45px_rgba(239,68,68,0.45),0_0_80px_rgba(245,158,11,0.25),inset_0_0_30px_rgba(245,158,11,0.18)]'
    : isLocked
      ? 'border border-slate-200/70 bg-white/40 backdrop-blur-lg dark:border-slate-700/40 dark:bg-slate-800/20'
      : isDone
        ? 'border border-slate-200 border-l-4 border-l-emerald-500 bg-emerald-50/60 dark:border-slate-700/40 dark:border-l-emerald-500 dark:bg-emerald-900/10'
        : 'border border-purple-400/50 bg-white dark:bg-slate-800/40';

  const cardBody = (
    <motion.div
      initial={isMaster ? { opacity: 0, scale: 0.75, y: 30 } : { opacity: 0, y: 24 }}
      animate={
        isMaster
          ? {
              opacity: 1,
              y: [0, -5, 0],
              scale: isActive ? [1.06, 1.1, 1.06] : 1.03,
            }
          : { opacity: 1, y: 0, scale: isActive ? [1.05, 1.07, 1.05] : 1 }
      }
      transition={
        isMaster
          ? {
              opacity: { duration: 0.7 },
              y: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
              scale: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' },
            }
          : isActive
            ? {
                opacity: { duration: 0.5, delay: index * 0.06 },
                y: { duration: 0.5, delay: index * 0.06 },
                scale: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
              }
            : { duration: 0.5, delay: index * 0.06 }
      }
      whileHover={!isLocked ? { y: -10, scale: isMaster ? 1.12 : 1.03, rotate: isDone ? 0 : -0.6 } : undefined}
      whileTap={!isLocked ? { scale: 0.97 } : undefined}
      style={{ width: CARD_W, minHeight: isMaster ? 184 : 168 }}
      className={`relative overflow-hidden rounded-3xl p-6 transition-colors duration-300 ${surface}`}
    >
      {/* Master Challenge Animated Shimmer Sweep & Floating Embers */}
      {isMaster && (
        <>
          <motion.span
            aria-hidden
            className="pointer-events-none absolute -inset-[2px] rounded-[26px] border-2 border-amber-300/80"
            animate={{ opacity: [0.35, 1, 0.35] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-amber-300/25 to-transparent"
            initial={{ x: '-160%' }}
            animate={{ x: '320%' }}
            transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 1.5, ease: 'easeInOut' }}
          />
          {[0, 1, 2, 3].map((spark) => (
            <motion.span
              key={spark}
              aria-hidden
              className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_8px_#f59e0b]"
              style={{ left: `${18 + spark * 22}%`, bottom: '10%' }}
              animate={{ y: [0, -90], opacity: [0, 1, 0], scale: [0.5, 1.3, 0.4] }}
              transition={{
                duration: 2 + spark * 0.3,
                repeat: Infinity,
                delay: spark * 0.45,
                ease: 'easeOut',
              }}
            />
          ))}
        </>
      )}

      {!isMaster && isActive && (
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
        } ${
          isMaster
            ? 'text-amber-400/15 drop-shadow-[0_0_12px_rgba(245,158,11,0.3)]'
            : isLocked
              ? 'text-slate-400/20'
              : isDone
                ? 'text-emerald-500/10'
                : 'text-purple-500/10'
        }`}
      >
        {numberDisplay}
      </span>

      <div
        dir={locale === 'ar' ? 'rtl' : 'ltr'}
        className={`relative z-10 transition-[filter] duration-300 ${isLocked ? 'blur-[2.5px] select-none' : ''}`}
      >
        <div className="flex items-center justify-between gap-2">
          {isMaster ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/60 bg-gradient-to-r from-amber-500/30 via-red-500/30 to-purple-600/30 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.4)]">
              <Crown size={13} className="text-amber-300" />
              {locale === 'ar' ? 'التحدي الماستر' : 'MASTER BOSS'}
            </span>
          ) : (
            <span
              className={`inline-block rounded-full px-3 py-1 text-[11px] font-bold ${DIFFICULTY_STYLES[challenge.difficulty]}`}
            >
              {difficultyLabel}
            </span>
          )}

          {isMaster && (
            <motion.span
              animate={{ rotate: [0, 12, -12, 0], scale: [1, 1.15, 1] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400/20 text-amber-300"
            >
              {isDone ? <Sparkles size={15} /> : <Flame size={15} className="text-orange-400" />}
            </motion.span>
          )}
        </div>

        <h3
          className={`mb-1 mt-3 text-lg font-extrabold leading-snug ${
            isMaster
              ? 'bg-gradient-to-r from-white via-amber-100 to-amber-300 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(245,158,11,0.35)]'
              : isLocked
                ? 'text-slate-400 dark:text-slate-500'
                : 'text-slate-900 dark:text-white'
          }`}
        >
          {locale === 'ar' ? challenge.titleAr : challenge.titleEn}
        </h3>

        <div
          className={`flex items-center gap-1.5 text-sm font-extrabold ${
            isMaster
              ? 'text-amber-300'
              : isLocked
                ? 'text-slate-400 dark:text-slate-600'
                : 'text-purple-600 dark:text-purple-400'
          }`}
        >
          <span>
            {challenge.points} {t('pts')}
          </span>
          {isMaster && (
            <span className="text-[11px] font-bold text-rose-300/90">
              • {locale === 'ar' ? 'الوحش الأخير' : 'FINAL STAGE'}
            </span>
          )}
        </div>
      </div>

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
      {isMaster && !isLocked && (
        <>
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -inset-8 -z-10 rounded-full blur-2xl"
            style={{
              background:
                'conic-gradient(from 0deg, #f59e0b, #ef4444, #a855f7, #ec4899, #fde047, #f59e0b)',
            }}
            animate={{ rotate: 360, opacity: [0.55, 0.85, 0.55], scale: [0.95, 1.08, 0.95] }}
            transition={{
              rotate: { duration: 6, repeat: Infinity, ease: 'linear' },
              opacity: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
              scale: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
            }}
          />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -inset-12 -z-20 rounded-full bg-gradient-to-r from-amber-500/30 via-red-600/30 to-purple-600/30 blur-3xl"
            animate={{ opacity: [0.3, 0.65, 0.3], scale: [0.9, 1.12, 0.9] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        </>
      )}

      {!isMaster && isActive && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -inset-6 -z-10 rounded-full blur-2xl"
          style={{ background: 'conic-gradient(from 0deg, #a855f7, #7e22ce, #c084fc, #a855f7)' }}
          animate={{ rotate: 360, opacity: [0.35, 0.55, 0.35] }}
          transition={{
            rotate: { duration: 9, repeat: Infinity, ease: 'linear' },
            opacity: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
          }}
        />
      )}

      {isLocked ? (
        cardBody
      ) : (
        <Link href={`/challenges/${labSlug}/${challenge.slug}`} className="block">
          {cardBody}
        </Link>
      )}
    </div>
  );
}

export default function SnakePath({
  labSlug,
  challenges,
}: {
  labSlug: string;
  challenges: PathChallenge[];
}) {
  // Hide the 6th Master Challenge completely until all first 5 challenges are solved
  const firstFiveSolved =
    challenges.length >= 6 && challenges.slice(0, 5).every((c) => Boolean(c.solved));

  const visibleChallenges =
    challenges.length >= 6 && !firstFiveSolved ? challenges.slice(0, 5) : challenges;

  const rows: PathChallenge[][] = [];
  for (let i = 0; i < visibleChallenges.length; i += 3) {
    rows.push(visibleChallenges.slice(i, i + 3));
  }

  return (
    <div dir="ltr" className="mx-auto flex w-fit flex-col">
      {rows.map((row, rowIdx) => {
        const reversed = rowIdx % 2 === 1;
        const display = reversed ? [...row].reverse() : row;
        const lastInRow = visibleChallenges.indexOf(row[row.length - 1]);

        return (
          <div key={rowIdx}>
            <div className={`flex items-center ${reversed ? 'justify-end' : 'justify-start'}`}>
              {display.map((c, i) => {
                const gi = visibleChallenges.indexOf(c);
                const following = display[i + 1];
                const targetIndex = following
                  ? Math.max(gi, visibleChallenges.indexOf(following))
                  : -1;

                return (
                  <Fragment key={c.id}>
                    <ChallengeNode labSlug={labSlug} challenge={c} index={gi} />
                    {following && (
                      <Wire
                        state={wireState(visibleChallenges[targetIndex], targetIndex === 5)}
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
                <Wire
                  state={wireState(visibleChallenges[lastInRow + 1], lastInRow + 1 === 5)}
                  direction="down"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}