import type { NutritionResult } from '@ai-food/shared-types';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/shared/ui';
import { NutritionRow } from '@/entities/nutrition';
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
            {confidencePct}% match
          </Badge>
        </div>
        <p className="text-3xl font-bold text-emerald-600 mt-1">
          {formatCalories(result.calories)}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <NutritionRow
          label="Protein"
          value={result.protein}
          unit="g"
          max={60}
          color="bg-blue-500"
        />
        <NutritionRow
          label="Carbohydrates"
          value={result.carbs}
          unit="g"
          max={150}
          color="bg-amber-500"
        />
        <NutritionRow
          label="Fat"
          value={result.fat}
          unit="g"
          max={80}
          color="bg-red-400"
        />
        <NutritionRow
          label="Fiber"
          value={result.fiber}
          unit="g"
          max={30}
          color="bg-green-500"
        />
      </CardContent>
    </Card>
  );
}
