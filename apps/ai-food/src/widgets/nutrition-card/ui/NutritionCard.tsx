import type { NutritionResult } from '@ai-food/shared-types';
import { Card, CardContent, CardHeader, CardTitle, MACRO_BAR_CLASSES } from '@/shared/ui';
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
          color={MACRO_BAR_CLASSES.protein}
        />
        <NutritionRow
          label="Углеводы"
          value={result.carbs}
          unit="г"
          max={150}
          color={MACRO_BAR_CLASSES.carbs}
        />
        <NutritionRow
          label="Жиры"
          value={result.fat}
          unit="г"
          max={80}
          color={MACRO_BAR_CLASSES.fat}
        />
        <NutritionRow
          label="Клетчатка"
          value={result.fiber}
          unit="г"
          max={30}
          color={MACRO_BAR_CLASSES.fiber}
        />
        {featureVitamins && (
          <MicronutrientsBadges micronutrients={result.micronutrients} />
        )}
      </CardContent>
    </Card>
  );
}
