'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, Lock } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { PathChallenge } from '@/types';

const CARD_W = 256;
const H_ARROW_W = 72;
const V_ARROW_W = 36;
const GAP = 8;
const ROW_W = CARD_W * 3 + 2 * (H_ARROW_W + GAP * 2);
const V_OFFSET = CARD_W / 2 - V_ARROW_W / 2; // centres the down-arrow under the end card

type ArrowState = 'done' | 'active' | 'future';

const ARROW_COLOR: Record<ArrowState, string> = {
  done: '#22c55e',   // green: already solved
  active: '#14b8a6', // glowing teal: the path you're on right now
  future: '#94a3b8', // dim slate: still locked
};

// Colour is decided by the challenge the arrow leads INTO.
function arrowState(next: PathChallenge): ArrowState {
  if (next.solved) return 'done';
  if (!next.locked) return 'active';
  return 'future';
}

function FlowArrow({ state, direction }: { state: ArrowState; direction: 'right' | 'left' | 'down' }) {
  const vertical = direction === 'down';
  const color = ARROW_COLOR[state];
  const width = vertical ? V_ARROW_W : H_ARROW_W;
  const height = vertical ? H_ARROW_W : V_ARROW_W;
  const line = vertical ? { x1: 18, y1: 4, x2: 18, y2: 46 } : { x1: 4, y1: 18, x2: 46, y2: 18 };
  const head = vertical ? '6,44 18,68 30,44' : '44,6 68,18 44,30';

  return (
    <div className="flex-shrink-0" style={{ width, height, transform: direction === 'left' ? 'scaleX(-1)' : undefined }}>
      <motion.div
        style={{ width, height }}
        animate={
          state === 'active'
            ? { filter: [`drop-shadow(0 0 3px ${color})`, `drop-shadow(0 0 12px ${color})`, `drop-shadow(0 0 3px ${color})`] }
            : undefined
        }
        transition={state === 'active' ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } : undefined}
      >
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
          {/* conduit */}
          <line {...line} stroke={color} strokeOpacity={state === 'future' ? 0.2 : 0.22} strokeWidth={10} strokeLinecap="round" />

          {state === 'active' && (
            <motion.line
              {...line}
              stroke={color}
              strokeWidth={6}
              strokeLinecap="round"
              strokeDasharray="7 11"
              initial={{ strokeDashoffset: 0 }}
              animate={{ strokeDashoffset: -18 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            />
          )}
          {state === 'done' && <line {...line} stroke={color} strokeWidth={6} strokeLinecap="round" />}
          {state === 'future' && (
            <line {...line} stroke={color} strokeOpacity={0.5} strokeWidth={4} strokeLinecap="round" strokeDasharray="2 10" />
          )}

          <motion.polygon
            points={head}
            fill={state === 'future' ? 'none' : color}
            stroke={color}
            strokeOpacity={state === 'future' ? 0.45 : 1}
            strokeWidth={4}
            strokeLinejoin="round"
            animate={state === 'active' ? { opacity: [0.65, 1, 0.65] } : undefined}
            transition={state === 'active' ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } : undefined}
          />
        </svg>
      </motion.div>
    </div>
  );
}

const DIFFICULTY_STYLES: Record<string, string> = {
  EASY: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20',
  MEDIUM: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20',
  HARD: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-500/20',
  EXPERT: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20',
};

function ChallengeNode({ labSlug, challenge, index }: { labSlug: string; challenge: PathChallenge; index: number }) {
  const t = useTranslations('challenge');
  const locale = useLocale();
  const isCurrent = !challenge.locked && !challenge.solved;

  const difficultyLabel =
    challenge.difficulty === 'EASY' ? t('difficultyEasy')
    : challenge.difficulty === 'MEDIUM' ? t('difficultyMedium')
    : challenge.difficulty === 'HARD' ? t('difficultyHard')
    : t('difficultyExpert');

  const surface = challenge.locked
    ? 'bg-slate-100 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.05] opacity-60 cursor-not-allowed'
    : challenge.solved
      ? 'bg-white dark:bg-white/[0.03] border-green-400/60 dark:border-green-400/30 shadow-sm'
      : 'bg-white dark:bg-white/[0.03] border-teal-400/70 shadow-[0_0_32px_rgba(20,184,166,0.28)]';

  const card = (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      whileHover={!challenge.locked ? { y: -6, scale: 1.03 } : undefined}
      whileTap={!challenge.locked ? { scale: 0.98 } : undefined}
      style={{ width: CARD_W, minHeight: 176 }}
      className={`relative rounded-3xl border p-6 backdrop-blur-2xl ${surface}`}
    >
      {isCurrent && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute -inset-1 rounded-[28px] border-2 border-teal-400/50"
          animate={{ opacity: [0.2, 0.8, 0.2], scale: [1, 1.03, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      <div dir={locale === 'ar' ? 'rtl' : 'ltr'}>
        <div className="mb-3 flex items-center justify-between">
          <span className="font-mono text-xs font-bold text-slate-400 dark:text-slate-500">{String(index + 1).padStart(2, '0')}</span>
          {challenge.locked ? (
            <Lock size={18} className="text-slate-400 dark:text-slate-500" />
          ) : challenge.solved ? (
            <Check size={18} className="text-green-500" />
          ) : null}
        </div>
        <span className={`inline-block rounded-full px-3 py-1 text-[11px] font-bold ${DIFFICULTY_STYLES[challenge.difficulty]}`}>
          {difficultyLabel}
        </span>
        <h3 className="mb-3 mt-3 text-lg font-bold leading-snug text-slate-900 dark:text-white">
          {locale === 'ar' ? challenge.titleAr : challenge.titleEn}
        </h3>
        <div className="bg-gradient-to-r from-teal-500 to-purple-600 bg-clip-text text-sm font-bold text-transparent">
          {challenge.points} {t('pts')}
        </div>
      </div>
    </motion.div>
  );

  return challenge.locked ? card : <Link href={`/challenges/${labSlug}/${challenge.slug}`} className="block">{card}</Link>;
}

export default function SnakePath({ labSlug, challenges }: { labSlug: string; challenges: PathChallenge[] }) {
  const rows: PathChallenge[][] = [];
  for (let i = 0; i < challenges.length; i += 3) rows.push(challenges.slice(i, i + 3));

  // dir="ltr": the S-shape is physical (left→right, then right→left), so it must not mirror in Arabic.
  return (
    <div dir="ltr" className="mx-auto flex flex-col" style={{ width: ROW_W }}>
      {rows.map((row, rowIdx) => {
        const reversed = rowIdx % 2 === 1;
        const display = reversed ? [...row].reverse() : row;
        const lastInRow = challenges.indexOf(row[row.length - 1]);

        return (
          <div key={rowIdx}>
            <div className={`flex items-center ${reversed ? 'justify-end' : 'justify-start'}`} style={{ gap: GAP }}>
              {display.map((c, i) => {
                const gi = challenges.indexOf(c);
                const following = display[i + 1];
                return (
                  <Fragment key={c.id}>
                    <ChallengeNode labSlug={labSlug} challenge={c} index={gi} />
                    {following && (
                      <FlowArrow
                        state={arrowState(challenges[Math.max(gi, challenges.indexOf(following))])}
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
                <FlowArrow state={arrowState(challenges[lastInRow + 1])} direction="down" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}