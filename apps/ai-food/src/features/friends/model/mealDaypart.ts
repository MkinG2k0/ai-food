import { Coffee, Cookie, Moon, Utensils } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type MealDaypart = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export function mealDaypart(iso: string): MealDaypart {
  const hour = new Date(iso).getHours();
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 16) return 'lunch';
  if (hour >= 16 && hour < 22) return 'dinner';
  return 'snack';
}

const DAYPART_UI: Record<
  MealDaypart,
  { label: string; Icon: LucideIcon; tileClass: string; iconClass: string }
> = {
  breakfast: {
    label: 'Завтрак',
    Icon: Coffee,
    tileClass: 'bg-amber-100',
    iconClass: 'text-amber-700',
  },
  lunch: {
    label: 'Обед',
    Icon: Utensils,
    tileClass: 'bg-emerald-100',
    iconClass: 'text-emerald-700',
  },
  dinner: {
    label: 'Ужин',
    Icon: Moon,
    tileClass: 'bg-indigo-100',
    iconClass: 'text-indigo-700',
  },
  snack: {
    label: 'Перекус',
    Icon: Cookie,
    tileClass: 'bg-rose-100',
    iconClass: 'text-rose-700',
  },
};

export function mealDaypartUi(iso: string) {
  return DAYPART_UI[mealDaypart(iso)];
}
