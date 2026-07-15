import { Badge } from '@/shared/ui';
import { formatCalories, formatMacro } from '@/shared/lib';

export interface FoodMacrosBadgesProps {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export function FoodMacrosBadges({
  calories,
  protein,
  fat,
  carbs,
}: FoodMacrosBadgesProps) {
  return (
    <div className="flex flex-wrap gap-1">
      <Badge
        variant="secondary"
        className="bg-emerald-50 text-emerald-700 border-emerald-100 font-semibold"
      >
        {formatCalories(calories)}
      </Badge>
      <Badge
        variant="secondary"
        className="bg-blue-50 text-blue-700 border-blue-100 font-semibold"
      >
        Б {formatMacro(protein)}
      </Badge>
      <Badge
        variant="secondary"
        className="bg-red-50 text-red-700 border-red-100 font-semibold"
      >
        Ж {formatMacro(fat)}
      </Badge>
      <Badge
        variant="secondary"
        className="bg-amber-50 text-amber-700 border-amber-100 font-semibold"
      >
        У {formatMacro(carbs)}
      </Badge>
    </div>
  );
}
