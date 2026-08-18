import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { localDateKey } from '@/entities/streak';
import { ProgressRings, RING_COLORS, type KbjuRingKey } from '@/shared/ui';
import type { FriendProfileMeal } from '../api/friendsApi';
import { mealDaypartUi } from '../model/mealDaypart';
import {
  FriendDayGoalSheet,
  type FriendDayGoal,
} from './FriendDayGoalSheet';

type FriendTargets = {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
};

type FriendProfileMealsProps = {
  meals: FriendProfileMeal[];
  targets: FriendTargets | null;
};

type DayGroup = {
  dateKey: string;
  dayNumber: number;
  meals: FriendProfileMeal[];
  totalCalories: number;
  protein: number;
  fat: number;
  carbs: number;
};

const FALLBACK_TARGETS: FriendTargets = {
  kcal: 2000,
  protein: 150,
  fat: 70,
  carbs: 250,
};

const DAY_RING_KEYS: KbjuRingKey[] = ['kcal', 'protein'];

function clamp01(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n >= 1) return 1;
  return n;
}

function groupMealsByDay(meals: FriendProfileMeal[]): DayGroup[] {
  const map = new Map<string, DayGroup>();

  for (const meal of meals) {
    const key = localDateKey(new Date(meal.timestamp));
    let group = map.get(key);
    if (!group) {
      const dayNumber = Number(key.split('-')[2]);
      group = {
        dateKey: key,
        dayNumber,
        meals: [],
        totalCalories: 0,
        protein: 0,
        fat: 0,
        carbs: 0,
      };
      map.set(key, group);
    }
    group.meals.push(meal);
    group.totalCalories += meal.totalCalories;
    group.protein += meal.protein;
    group.fat += meal.fat;
    group.carbs += meal.carbs;
  }

  return [...map.values()].sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}

function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatWeekday(dateKey: string): string {
  return parseDateKey(dateKey).toLocaleDateString('ru-RU', {
    weekday: 'long',
  });
}

function formatDayLabel(dateKey: string): string {
  return parseDateKey(dateKey).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  });
}

function mealsWord(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'приём';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'приёма';
  return 'приёмов';
}

function formatMealTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function dayProgress(group: DayGroup, targets: FriendTargets) {
  return {
    kcal: clamp01(
      targets.kcal > 0 ? group.totalCalories / targets.kcal : 0,
    ),
    protein: clamp01(
      targets.protein > 0 ? group.protein / targets.protein : 0,
    ),
    fat: clamp01(targets.fat > 0 ? group.fat / targets.fat : 0),
    carbs: clamp01(targets.carbs > 0 ? group.carbs / targets.carbs : 0),
  };
}

function ringsAriaLabel(
  dateKey: string,
  progress: ReturnType<typeof dayProgress>,
): string {
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  return `Цель за ${formatDayLabel(dateKey)}: калории ${pct(progress.kcal)}, белки ${pct(progress.protein)}`;
}

function toGoalDay(day: DayGroup, goals: FriendTargets): FriendDayGoal {
  return {
    dateKey: day.dateKey,
    weekday: formatWeekday(day.dateKey),
    dateLabel: formatDayLabel(day.dateKey),
    mealCount: day.meals.length,
    mealsWord: mealsWord(day.meals.length),
    consumed: {
      kcal: day.totalCalories,
      protein: day.protein,
      fat: day.fat,
      carbs: day.carbs,
    },
    goals,
  };
}

function MealThumb({ timestamp }: { timestamp: string }) {
  const { label, Icon, tileClass, iconClass } = mealDaypartUi(timestamp);
  return (
    <div
      className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${tileClass}`}
      aria-label={label}
    >
      <Icon className={`h-7 w-7 ${iconClass}`} aria-hidden />
    </div>
  );
}

function MacroPills({
  calories,
  protein,
  fat,
  carbs,
  time,
}: {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  time: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex items-baseline gap-1">
        <span
          className="text-lg font-semibold tabular-nums leading-none"
          style={{ color: RING_COLORS.kcal }}
        >
          {Math.round(calories)}
        </span>
        <span className="text-xs font-medium text-muted-foreground">ккал</span>
      </div>
      <div className="flex min-w-0 items-center gap-2.5 overflow-hidden text-xs tabular-nums">
        <span className="inline-flex items-center gap-1">
          <span
            className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
            style={{ backgroundColor: RING_COLORS.protein }}
            aria-hidden
          >
            Б
          </span>
          {Math.round(protein)}
        </span>
        <span className="inline-flex items-center gap-1">
          <span
            className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
            style={{ backgroundColor: RING_COLORS.fat }}
            aria-hidden
          >
            Ж
          </span>
          {Math.round(fat)}
        </span>
        <span className="inline-flex items-center gap-1">
          <span
            className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
            style={{ backgroundColor: RING_COLORS.carbs }}
            aria-hidden
          >
            У
          </span>
          {Math.round(carbs)}
        </span>
        <span className="ml-auto shrink-0 text-muted-foreground">{time}</span>
      </div>
    </div>
  );
}

export function FriendProfileMeals({
  meals,
  targets,
}: FriendProfileMealsProps) {
  const [sheetDay, setSheetDay] = useState<FriendDayGoal | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  if (meals.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        За последние 7 дней приёмов пищи нет.
      </p>
    );
  }

  const goals = targets ?? FALLBACK_TARGETS;
  const dayGroups = groupMealsByDay(meals);

  return (
    <div className="space-y-5">
      {dayGroups.map((day) => {
        const progress = dayProgress(day, goals);
        const kcalHit = progress.kcal >= 1;
        const weekday = formatWeekday(day.dateKey);
        return (
          <section key={day.dateKey} className="space-y-2">
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card px-2 py-2 text-left shadow-sm transition-colors hover:bg-muted/50 active:bg-muted/70"
              onClick={() => {
                setSheetDay(toGoalDay(day, goals));
                setSheetOpen(true);
              }}
              aria-haspopup="dialog"
              aria-expanded={sheetOpen && sheetDay?.dateKey === day.dateKey}
              aria-label={`Подробнее о цели за ${weekday}, ${formatDayLabel(day.dateKey)}`}
            >
              <ProgressRings
                label={day.dayNumber}
                progress={progress}
                keys={DAY_RING_KEYS}
                showArcs
                testId={`friend-day-rings-${day.dateKey}`}
                aria-label={ringsAriaLabel(day.dateKey, progress)}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium capitalize">
                    {weekday}
                  </span>
                  {kcalHit ? (
                    <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                      цель
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDayLabel(day.dateKey)} · {day.meals.length}{' '}
                  {mealsWord(day.meals.length)}
                </p>
              </div>
              <p className="shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                {Math.round(day.totalCalories)} ккал
              </p>
              <ChevronRight
                className="h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
            </button>
            <ul className="space-y-2">
              {day.meals.map((meal) => (
                <li
                  key={meal.id}
                  className="flex gap-3 rounded-2xl border border-border/60 bg-card p-2.5 shadow-sm"
                >
                  <MealThumb timestamp={meal.timestamp} />
                  <div className="flex min-w-0 flex-1 flex-col justify-between gap-0.5 py-0.5">
                    <p className="truncate text-sm font-medium">
                      {meal.name?.trim() || 'Приём пищи'}
                    </p>
                    <MacroPills
                      calories={meal.totalCalories}
                      protein={meal.protein}
                      fat={meal.fat}
                      carbs={meal.carbs}
                      time={formatMealTime(meal.timestamp)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <FriendDayGoalSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        day={sheetDay}
      />
    </div>
  );
}
