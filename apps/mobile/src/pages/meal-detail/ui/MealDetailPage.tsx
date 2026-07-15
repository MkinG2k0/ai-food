import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useDiaryStore, useMealImage } from '@/entities/meal';
import { NutritionRow } from '@/entities/nutrition';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/ui';
import { formatCalories, formatMacro, formatDate } from '@/shared/lib';

export function MealDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const meals = useDiaryStore((s) => s.meals);
  const meal = meals.find((m) => m.id === id);
  const imageSrc = useMealImage(meal?.imageUri);

  useEffect(() => {
    if (!meal) {
      navigate('/diary', { replace: true });
    }
  }, [meal, navigate]);

  if (!meal) {
    return null;
  }

  const time = new Date(meal.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const totals = meal.items.reduce(
    (acc, item) => ({
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
    }),
    { protein: 0, carbs: 0, fat: 0 }
  );

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="flex items-center px-4 py-4 border-b">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold ml-2">Meal Details</h1>
      </header>

      <main className="flex-1 px-4 py-4 space-y-4">
        {imageSrc && (
          <img
            src={imageSrc}
            alt={meal.items.map((item) => item.name).join(', ')}
            className="w-full h-56 object-cover rounded-xl"
          />
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {formatDate(meal.timestamp)} at {time}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-2xl font-semibold text-emerald-600">
              {formatCalories(meal.totalCalories)}
            </p>
            <div className="space-y-3">
              <NutritionRow label="Protein" value={totals.protein} unit="g" />
              <NutritionRow label="Carbs" value={totals.carbs} unit="g" />
              <NutritionRow label="Fat" value={totals.fat} unit="g" />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h2 className="font-semibold text-foreground">Items</h2>
          {meal.items.map((item) => (
            <Card key={item.id}>
              <CardContent className="py-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <Badge variant="outline">{item.portion}</Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{formatCalories(item.calories)}</span>
                  <span>{formatMacro(item.protein)} protein</span>
                  <span>{formatMacro(item.carbs)} carbs</span>
                  <span>{formatMacro(item.fat)} fat</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
