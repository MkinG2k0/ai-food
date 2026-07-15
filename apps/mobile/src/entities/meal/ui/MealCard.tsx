import { Utensils } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Meal } from '@ai-food/shared-types';
import { Card, CardContent } from '@/shared/ui';
import { formatCalories } from '@/shared/lib';
import { useMealImage } from '../model/useMealImage';

interface MealCardProps {
  meal: Meal;
}

export function MealCard({ meal }: MealCardProps) {
  const navigate = useNavigate();
  const imageSrc = useMealImage(meal.imageUri);
  const time = new Date(meal.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const foodNames = meal.items.map((item) => item.name).join(', ');

  function goToDetail() {
    navigate(`/meal/${meal.id}`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      goToDetail();
    }
  }

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={goToDetail}
      onKeyDown={handleKeyDown}
      aria-label={`${foodNames} at ${time}`}
      className="cursor-pointer"
    >
      <CardContent className="flex items-center gap-3 py-3">
        <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {imageSrc ? (
            <img src={imageSrc} alt="" className="h-full w-full object-cover" />
          ) : (
            <Utensils className="h-5 w-5 text-emerald-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          {meal.items.map((item) => (
            <p key={item.id} className="text-sm font-medium truncate">
              {item.name}
            </p>
          ))}
          <p className="text-xs text-muted-foreground">{time}</p>
        </div>
        <p className="text-sm font-semibold text-emerald-600 flex-shrink-0">
          {formatCalories(meal.totalCalories)}
        </p>
      </CardContent>
    </Card>
  );
}
