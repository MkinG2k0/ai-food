import { Flame } from 'lucide-react';

interface NutritionSummaryCardProps {
  consumedKcal: number;
  consumedProtein: number;
  consumedFat: number;
  consumedCarbs: number;
  goalKcal: number;
  goalProtein: number;
  goalFat: number;
  goalCarbs: number;
}

const RING_SIZE = 72;
const RING_STROKE = 6;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

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
  const overGoal = consumed > goal;
  const fillPct = goal > 0 ? Math.min((consumed / goal) * 100, 100) : 0;

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barClassName}`}
          style={{ width: `${fillPct}%` }}
        />
      </div>
      <span
        className={`text-xs font-medium tabular-nums ${
          overGoal ? 'text-destructive' : 'text-foreground'
        }`}
      >
        {Math.round(consumed)}/{Math.round(goal)}г
      </span>
    </div>
  );
}

export function NutritionSummaryCard({
  consumedKcal,
  consumedProtein,
  consumedFat,
  consumedCarbs,
  goalKcal,
  goalProtein,
  goalFat,
  goalCarbs,
}: NutritionSummaryCardProps) {
  const remaining = Math.max(0, Math.round(goalKcal - consumedKcal));
  const overGoal = consumedKcal > goalKcal;
  const progress = goalKcal > 0 ? Math.min(consumedKcal / goalKcal, 1) : 0;
  const dashOffset = RING_CIRCUMFERENCE * (1 - progress);

  return (
    <div className="mt-4 rounded-2xl border bg-card text-card-foreground shadow-sm p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold tabular-nums tracking-tight">
              {remaining}
            </span>
            <span className="text-sm text-muted-foreground tabular-nums">
              /{Math.round(goalKcal)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Калорий осталось</p>
          {overGoal && (
            <p className="text-xs text-destructive mt-1">
              +{Math.round(consumedKcal - goalKcal)} сверх нормы
            </p>
          )}
        </div>

        <div
          className="relative shrink-0"
          style={{ width: RING_SIZE, height: RING_SIZE }}
          aria-hidden
        >
          <svg
            width={RING_SIZE}
            height={RING_SIZE}
            viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
            className="-rotate-90"
          >
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              fill="none"
              strokeWidth={RING_STROKE}
              className="stroke-muted"
            />
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              fill="none"
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              className={overGoal ? 'stroke-destructive' : 'stroke-primary'}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <Flame
              className={`h-5 w-5 ${overGoal ? 'text-destructive' : 'text-primary'}`}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
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
      </div>
    </div>
  );
}
