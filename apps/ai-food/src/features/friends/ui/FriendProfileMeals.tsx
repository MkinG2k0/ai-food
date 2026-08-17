import { ImageIcon } from 'lucide-react';
import type { FriendProfileMeal } from '../api/friendsApi';

type FriendProfileMealsProps = {
  meals: FriendProfileMeal[];
  sharePhotosToFriends: boolean;
};

function formatMealTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
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

  return (
    <ul className="space-y-2">
      {meals.map((meal) => (
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
              {Math.round(meal.totalCalories)} ккал · Б {Math.round(meal.protein)} · Ж{' '}
              {Math.round(meal.fat)} · У {Math.round(meal.carbs)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
