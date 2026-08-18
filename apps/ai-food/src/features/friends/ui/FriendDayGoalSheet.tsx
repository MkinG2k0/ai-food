import { BottomSheet, RING_COLORS } from '@/shared/ui';

export type FriendDayGoal = {
  dateKey: string;
  weekday: string;
  dateLabel: string;
  mealCount: number;
  mealsWord: string;
  consumed: {
    kcal: number;
    protein: number;
    fat: number;
    carbs: number;
  };
  goals: {
    kcal: number;
    protein: number;
    fat: number;
    carbs: number;
  };
};

type FriendDayGoalSheetProps = {
  open: boolean;
  onClose: () => void;
  day: FriendDayGoal | null;
};

const MACRO_ROWS = [
  { key: 'protein' as const, label: 'Белки', color: RING_COLORS.protein },
  { key: 'fat' as const, label: 'Жиры', color: RING_COLORS.fat },
  { key: 'carbs' as const, label: 'Углеводы', color: RING_COLORS.carbs },
];

function fillPct(consumed: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(100, (consumed / goal) * 100);
}

function GoalBar({
  label,
  unit,
  color,
  consumed,
  goal,
  compact = false,
}: {
  label: string;
  unit: string;
  color: string;
  consumed: number;
  goal: number;
  compact?: boolean;
}) {
  const eaten = Math.round(consumed);
  const target = Math.round(goal);
  const over = eaten > target;
  const delta = over ? eaten - target : Math.max(0, target - eaten);

  return (
    <div className={compact ? 'min-w-0 space-y-1' : 'space-y-1.5'}>
      <div className="flex items-baseline justify-between gap-2">
        <span className={compact ? 'text-xs text-muted-foreground' : 'text-sm font-medium'}>
          {label}
        </span>
        {!compact ? (
          <span className="text-sm tabular-nums">
            <span className={over ? 'font-semibold text-destructive' : 'font-semibold'}>
              {eaten}
            </span>
            <span className="text-muted-foreground">
              {' '}
              / {target} {unit}
            </span>
          </span>
        ) : null}
      </div>
      <div className={`overflow-hidden rounded-full bg-muted ${compact ? 'h-1.5' : 'h-2'}`}>
        <div
          className="h-full rounded-full"
          style={{ width: `${fillPct(eaten, target)}%`, backgroundColor: color }}
        />
      </div>
      {compact ? (
        <p
          className={`text-xs font-medium tabular-nums ${
            over ? 'text-destructive' : 'text-foreground'
          }`}
        >
          {eaten}/{target}{unit}
        </p>
      ) : (
        <p className={`text-xs ${over ? 'text-destructive' : 'text-muted-foreground'}`}>
          {over ? `+${delta} сверх цели` : `осталось ${delta} ${unit}`}
        </p>
      )}
    </div>
  );
}

export function FriendDayGoalSheet({
  open,
  onClose,
  day,
}: FriendDayGoalSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      {day ? (
        <div className="max-h-[min(70vh,32rem)] space-y-5 overflow-y-auto px-1">
          <div>
            <h2 className="text-lg font-semibold capitalize">{day.weekday}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {day.dateLabel} · {day.mealCount} {day.mealsWord}
            </p>
          </div>

          <GoalBar
            label="Калории"
            unit="ккал"
            color={RING_COLORS.kcal}
            consumed={day.consumed.kcal}
            goal={day.goals.kcal}
          />

          <div className="grid grid-cols-3 gap-3">
            {MACRO_ROWS.map((row) => (
              <GoalBar
                key={row.key}
                label={row.label}
                unit="г"
                color={row.color}
                consumed={day.consumed[row.key]}
                goal={day.goals[row.key]}
                compact
              />
            ))}
          </div>
        </div>
      ) : null}
    </BottomSheet>
  );
}
