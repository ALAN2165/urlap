'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Lock, Crown, Sparkles } from 'lucide-react';
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
  master: '#d97706',
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
                ? 'linear-gradient(90deg, #d97706, #b45309, #78350f)'
                : color,
          opacity: state === 'future' ? 0.55 : state === 'done' || state === 'master' ? 0.95 : 0.3,
          boxShadow: state === 'master' ? '0 0 10px rgba(217,119,6,0.5)' : undefined,
        }}
      />

      {state === 'master' && (
        <motion.span
          className="absolute h-[6px] w-[6px] rounded-full bg-amber-300 shadow-[0_0_8px_#fbbf24]"
          style={{ ...(vertical ? { left: '50%', marginLeft: -3 } : { top: '50%', marginTop: -3 }) }}
          animate={vertical ? { top: ['0%', '100%'] } : { left: ['0%', '100%'] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
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

  // تصميم هادئ، فخم، ومريح للعين مستوحى من الـ Dark Theme الاحترافي
  const surface = isMaster
    ? isDone
      ? 'border border-amber-500/60 bg-gradient-to-br from-slate-900 via-zinc-900 to-amber-950/40 text-white shadow-[0_4px_25px_rgba(217,119,6,0.2)]'
      : 'border border-amber-500/70 bg-gradient-to-br from-[#121019] via-[#1a1322] to-[#241710] text-white shadow-[0_8px_32px_rgba(217,119,6,0.25)]'
    : isLocked
      ? 'border border-slate-200/70 bg-white/40 backdrop-blur-lg dark:border-slate-700/40 dark:bg-slate-800/20'
      : isDone
        ? 'border border-slate-200 border-l-4 border-l-emerald-500 bg-emerald-50/60 dark:border-slate-700/40 dark:border-l-emerald-500 dark:bg-emerald-900/10'
        : 'border border-purple-400/50 bg-white dark:bg-slate-800/40';

  const cardBody = (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04 }}
      whileHover={!isLocked ? { y: -6, scale: 1.02 } : undefined}
      whileTap={!isLocked ? { scale: 0.98 } : undefined}
      style={{ width: CARD_W, minHeight: 168 }}
      className={`relative overflow-hidden rounded-3xl p-6 transition-colors duration-300 ${surface}`}
    >
      {/* إزالة الإزعاج البصري والوميض السريع، والاعتماد على هالة ناعمة وثابتة */}
      {isMaster && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-3xl border border-amber-400/30 bg-amber-500/[0.03]"
        />
      )}

      {!isMaster && isActive && (
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-[1px] rounded-[26px] border border-purple-400/50"
        />
      )}

      <span
        aria-hidden
        className={`pointer-events-none absolute -bottom-3 select-none text-7xl font-black leading-none ${
          locale === 'ar' ? '-left-1' : '-right-1'
        } ${
          isMaster
            ? 'text-amber-500/10'
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
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-300">
              <Crown size={13} className="text-amber-400" />
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
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
              {isDone ? <Sparkles size={13} /> : <Crown size={13} />}
            </span>
          )}
        </div>

        <h3
          className={`mb-1 mt-3 text-lg font-bold leading-snug ${
            isMaster
              ? 'text-amber-200'
              : isLocked
                ? 'text-slate-400 dark:text-slate-500'
                : 'text-slate-900 dark:text-white'
          }`}
        >
          {locale === 'ar' ? challenge.titleAr : challenge.titleEn}
        </h3>

        <div
          className={`flex items-center gap-1.5 text-sm font-semibold ${
            isMaster
              ? 'text-amber-400/90'
              : isLocked
                ? 'text-slate-400 dark:text-slate-600'
                : 'text-purple-600 dark:text-purple-400'
          }`}
        >
          <span>
            {challenge.points} {t('pts')}
          </span>
          {isMaster && (
            <span className="text-[11px] font-medium text-amber-300/70">
              • {locale === 'ar' ? 'المرحلة الأخيرة' : 'Final Stage'}
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
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-3 -z-10 rounded-3xl bg-amber-500/10 blur-xl"
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