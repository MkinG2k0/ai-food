import type { NutritionResult } from '@ai-food/shared-types';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/shared/ui';
import { MicronutrientsBadges, NutritionRow } from '@/entities/nutrition';
import { formatCalories } from '@/shared/lib';

interface NutritionCardProps {
  result: NutritionResult;
}

export function NutritionCard({ result }: NutritionCardProps) {
  const confidencePct = Math.round(result.confidence * 100);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg leading-tight">{result.foodName}</CardTitle>
          <Badge variant="secondary" className="flex-shrink-0">
            {confidencePct}% совпадение
          </Badge>
        </div>
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
        <MicronutrientsBadges micronutrients={result.micronutrients} />
      </CardContent>
    </Card>
  );
}
