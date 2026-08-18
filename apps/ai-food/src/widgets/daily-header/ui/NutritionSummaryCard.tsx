import { useEffect, useRef, useState } from 'react';
import { Flame } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ENTRANCE_EASE,
  entranceContainer,
  entranceItem,
  useAnimatedNumber,
} from '@/shared/lib';
import { MACRO_BAR_CLASSES } from '@/shared/ui';

interface NutritionSummaryCardProps {
  entranceKey: string;
  consumedKcal: number;
  consumedProtein: number;
  consumedFat: number;
  consumedCarbs: number;
  consumedFiber: number;
  goalKcal: number;
  goalProtein: number;
  goalFat: number;
  goalCarbs: number;
  goalFiber: number;
  onFlameClick?: () => void;
}

const RING_SIZE = 72;
const RING_STROKE = 6;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const BAR_TRANSITION = { duration: 0.85, ease: ENTRANCE_EASE };
const RING_TRANSITION = { duration: 0.9, ease: ENTRANCE_EASE };

function MacroColumn({
  label,
  consumed,
  goal,
  barClassName,
  entranceKey,
  barDelay = 0,
}: {
  label: string;
  consumed: number;
  goal: number;
  barClassName: string;
  entranceKey: string;
  barDelay?: number;
}) {
  const reducedMotion = useReducedMotion();
  const animatedConsumed = useAnimatedNumber(consumed, {
    resetKey: entranceKey,
    duration: 0.85,
    delay: barDelay,
  });
  const overGoal = consumed > goal;
  const fillPct = goal > 0 ? Math.min((consumed / goal) * 100, 100) : 0;

  return (
    <motion.div className="flex min-w-0 flex-col gap-1.5" variants={entranceItem(reducedMotion)}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          key={entranceKey}
          className={`h-full rounded-full ${barClassName}`}
          initial={{ width: reducedMotion ? `${fillPct}%` : '0%' }}
          animate={{ width: `${fillPct}%` }}
          transition={{ ...BAR_TRANSITION, delay: barDelay }}
        />
      </div>
      <span
        className={`text-xs font-medium tabular-nums ${
          overGoal ? 'text-destructive' : 'text-foreground'
        }`}
      >
        {animatedConsumed}/{Math.round(goal)}г
      </span>
    </motion.div>
  );
}

export function NutritionSummaryCard({
  entranceKey,
  consumedKcal,
  consumedProtein,
  consumedFat,
  consumedCarbs,
  consumedFiber,
  goalKcal,
  goalProtein,
  goalFat,
  goalCarbs,
  goalFiber,
  onFlameClick,
}: NutritionSummaryCardProps) {
  const reducedMotion = useReducedMotion();
  const remainingTarget = Math.max(0, Math.round(goalKcal - consumedKcal));
  const animatedRemaining = useAnimatedNumber(remainingTarget, {
    resetKey: entranceKey,
    duration: 1,
    delay: 0.15,
  });
  const overGoal = consumedKcal > goalKcal;
  const overBy = Math.round(consumedKcal - goalKcal);
  const animatedOverBy = useAnimatedNumber(Math.max(0, overBy), {
    resetKey: entranceKey,
    duration: 0.75,
    delay: 0.35,
  });
  const progress = goalKcal > 0 ? Math.min(consumedKcal / goalKcal, 1) : 0;
  const dashOffset = RING_CIRCUMFERENCE * (1 - progress);

  const prevConsumedKcal = useRef(consumedKcal);
  const [flamePulse, setFlamePulse] = useState(0);

  useEffect(() => {
    if (consumedKcal > prevConsumedKcal.current) {
      setFlamePulse((n) => n + 1);
    }
    prevConsumedKcal.current = consumedKcal;
  }, [consumedKcal]);

  return (
    <motion.div
      key={entranceKey}
      className="mt-4 rounded-2xl border bg-card p-4 text-card-foreground shadow-sm"
      variants={entranceContainer(reducedMotion)}
      initial="hidden"
      animate="show"
    >
      <motion.div
        className="flex items-center justify-between gap-4"
        variants={entranceItem(reducedMotion)}
      >
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold tabular-nums tracking-tight">
              {animatedRemaining}
            </span>
            <span className="text-sm tabular-nums text-muted-foreground">
              /{Math.round(goalKcal)}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">Калорий осталось</p>
          {overGoal && (
            <p className="mt-1 text-xs text-destructive">
              +{animatedOverBy} сверх нормы
            </p>
          )}
        </div>

        <button
          type="button"
          className="relative shrink-0 rounded-full outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          style={{ width: RING_SIZE, height: RING_SIZE }}
          aria-label="Бюджет дня"
          onClick={onFlameClick}
        >
          <svg
            width={RING_SIZE}
            height={RING_SIZE}
            viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
            className="-rotate-90"
            aria-hidden
          >
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              fill="none"
              strokeWidth={RING_STROKE}
              className="stroke-muted"
            />
            <motion.circle
              key={entranceKey}
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              fill="none"
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              initial={{
                strokeDashoffset: reducedMotion
                  ? dashOffset
                  : RING_CIRCUMFERENCE,
              }}
              animate={{ strokeDashoffset: dashOffset }}
              transition={
                reducedMotion
                  ? { duration: 0 }
                  : { ...RING_TRANSITION, delay: 0.2 }
              }
              className={overGoal ? 'stroke-destructive' : 'stroke-primary'}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              key={`${entranceKey}-${flamePulse}`}
              initial={
                flamePulse === 0 || reducedMotion
                  ? false
                  : { scale: 1 }
              }
              animate={
                flamePulse === 0 || reducedMotion
                  ? { scale: 1, rotate: 0 }
                  : {
                      scale: [1, 1.35, 0.92, 1.12, 1],
                      rotate: [0, -12, 10, -6, 0],
                    }
              }
              transition={{ duration: 0.55, ease: 'easeOut' }}
            >
              <Flame
                className={`h-5 w-5 ${
                  overGoal ? 'text-destructive' : 'text-primary'
                }`}
                aria-hidden
              />
            </motion.div>
          </div>
        </button>
      </motion.div>

      <motion.div
        className="mt-4 grid grid-cols-4 gap-2 sm:gap-3"
        variants={entranceItem(reducedMotion)}
      >
        <MacroColumn
          label="Белки"
          consumed={consumedProtein}
          goal={goalProtein}
          barClassName={MACRO_BAR_CLASSES.protein}
          entranceKey={entranceKey}
          barDelay={0.28}
        />
        <MacroColumn
          label="Жир"
          consumed={consumedFat}
          goal={goalFat}
          barClassName={MACRO_BAR_CLASSES.fat}
          entranceKey={entranceKey}
          barDelay={0.34}
        />
        <MacroColumn
          label="Углеводы"
          consumed={consumedCarbs}
          goal={goalCarbs}
          barClassName={MACRO_BAR_CLASSES.carbs}
          entranceKey={entranceKey}
          barDelay={0.4}
        />
        <MacroColumn
          label="Клетчатка"
          consumed={consumedFiber}
          goal={goalFiber}
          barClassName={MACRO_BAR_CLASSES.fiber}
          entranceKey={entranceKey}
          barDelay={0.46}
        />
      </motion.div>
    </motion.div>
  );
}
