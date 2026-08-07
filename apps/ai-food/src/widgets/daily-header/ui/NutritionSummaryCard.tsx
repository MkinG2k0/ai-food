import { useEffect, useRef, useState } from 'react';
import { Flame } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useAnimatedNumber } from '@/shared/lib';

interface NutritionSummaryCardProps {
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

const BAR_TRANSITION = { duration: 0.75, ease: 'easeOut' as const };
const RING_TRANSITION = { duration: 0.75, ease: 'easeOut' as const };

function MacroColumn({
  label,
  consumed,
  goal,
  barClassName,
}: {
  label: string;
  consumed: number;
  goal: number;
  barClassName: string;
}) {
  const animatedConsumed = useAnimatedNumber(consumed);
  const overGoal = consumed > goal;
  const fillPct = goal > 0 ? Math.min((consumed / goal) * 100, 100) : 0;

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barClassName}`}
          initial={false}
          animate={{ width: `${fillPct}%` }}
          transition={BAR_TRANSITION}
        />
      </div>
      <span
        className={`text-xs font-medium tabular-nums ${
          overGoal ? 'text-destructive' : 'text-foreground'
        }`}
      >
        {animatedConsumed}/{Math.round(goal)}г
      </span>
    </div>
  );
}

export function NutritionSummaryCard({
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
  const animatedRemaining = useAnimatedNumber(remainingTarget);
  const overGoal = consumedKcal > goalKcal;
  const overBy = Math.round(consumedKcal - goalKcal);
  const animatedOverBy = useAnimatedNumber(Math.max(0, overBy));
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
    <div className="mt-4 rounded-2xl border bg-card text-card-foreground shadow-sm p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold tabular-nums tracking-tight">
              {animatedRemaining}
            </span>
            <span className="text-sm text-muted-foreground tabular-nums">
              /{Math.round(goalKcal)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Калорий осталось</p>
          {overGoal && (
            <p className="text-xs text-destructive mt-1">
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
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              fill="none"
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              initial={false}
              animate={{ strokeDashoffset: dashOffset }}
              transition={reducedMotion ? { duration: 0 } : RING_TRANSITION}
              className={overGoal ? 'stroke-destructive' : 'stroke-primary'}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              key={flamePulse}
              initial={flamePulse === 0 || reducedMotion ? false : { scale: 1 }}
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
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 sm:gap-3">
        <MacroColumn
          label="Белки"
          consumed={consumedProtein}
          goal={goalProtein}
          barClassName="bg-rose-400"
        />
        <MacroColumn
          label="Жир"
          consumed={consumedFat}
          goal={goalFat}
          barClassName="bg-amber-400"
        />
        <MacroColumn
          label="Углеводы"
          consumed={consumedCarbs}
          goal={goalCarbs}
          barClassName="bg-sky-500"
        />
        <MacroColumn
          label="Клетчатка"
          consumed={consumedFiber}
          goal={goalFiber}
          barClassName="bg-emerald-500"
        />
      </div>
    </div>
  );
}
