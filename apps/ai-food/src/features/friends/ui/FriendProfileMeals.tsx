import { ImageIcon } from 'lucide-react';
import { localDateKey } from '@/entities/streak';
import type { FriendProfileMeal } from '../api/friendsApi';

type FriendProfileMealsProps = {
  meals: FriendProfileMeal[];
  sharePhotosToFriends: boolean;
};

type DayGroup = {
  dateKey: string;
  meals: FriendProfileMeal[];
  totalCalories: number;
  protein: number;
  fat: number;
  carbs: number;
};

function groupMealsByDay(meals: FriendProfileMeal[]): DayGroup[] {
  const map = new Map<string, DayGroup>();

  for (const meal of meals) {
    const key = localDateKey(new Date(meal.timestamp));
    let group = map.get(key);
    if (!group) {
      group = {
        dateKey: key,
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

function formatDayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  });
}

function formatMealTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDaySummary(group: DayGroup): string {
  return `${Math.round(group.totalCalories)} ккал · Б ${Math.round(group.protein)} · Ж ${Math.round(group.fat)} · У ${Math.round(group.carbs)}`;
}

export function FriendProfileMeals({
  meals,
  sharePhotosToFriends,
}: FriendProfileMealsProps) {
  if (meals.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        За последние 7 дней приёмов пищи нет.
      </p>
    );
  }

  const dayGroups = groupMealsByDay(meals);

  return (
    <div className="space-y-4">
      {dayGroups.map((day) => (
        <section key={day.dateKey} className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-medium">{formatDayLabel(day.dateKey)}</h3>
            <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {formatDaySummary(day)}
            </p>
          </div>
          <ul className="space-y-2">
            {day.meals.map((meal) => (
              <li
                key={meal.id}
                className="flex gap-3 rounded-lg border border-input bg-background px-3 py-2"
              >
                {sharePhotosToFriends ? (
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
                    aria-hidden
                  >
                    <ImageIcon className="h-4 w-4" />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {meal.name?.trim() || 'Приём пищи'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatMealTime(meal.timestamp)}
                  </p>
                  <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                    {Math.round(meal.totalCalories)} ккал · Б {Math.round(meal.protein)}{' '}
                    · Ж {Math.round(meal.fat)} · У {Math.round(meal.carbs)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
