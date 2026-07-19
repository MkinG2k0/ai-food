import type { NutritionResult } from '@ai-food/shared-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui';
import { MicronutrientsBadges, NutritionRow } from '@/entities/nutrition';
import { useSettingsStore } from '@/features/settings';
import { formatCalories } from '@/shared/lib';

interface NutritionCardProps {
  result: NutritionResult;
}

export function NutritionCard({ result }: NutritionCardProps) {
  const featureVitamins = useSettingsStore((s) => s.featureVitamins);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg leading-tight">{result.foodName}</CardTitle>
        <p className="text-3xl font-bold text-emerald-600 mt-1">
          {formatCalories(result.calories)}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <NutritionRow
          label="Белки"
          value={result.protein}
          unit="г"
          max={60}
          color="bg-blue-500"
        />
        <NutritionRow
          label="Углеводы"
          value={result.carbs}
          unit="г"
          max={150}
          color="bg-amber-500"
        />
        <NutritionRow
          label="Жиры"
          value={result.fat}
          unit="г"
          max={80}
          color="bg-red-400"
        />
        <NutritionRow
          label="Клетчатка"
          value={result.fiber}
          unit="г"
          max={30}
          color="bg-green-500"
        />
        {featureVitamins && (
          <MicronutrientsBadges micronutrients={result.micronutrients} />
        )}
      </CardContent>
    </Card>
  );
}
