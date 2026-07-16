import { Utensils } from 'lucide-react';
import { useMealImage } from '@/entities/meal';
import { formatCalories } from '@/shared/lib';
import { Button } from '@/shared/ui';
import type { FavoriteFood } from '../model/favoriteFood';
import { useFavoritesStore } from '../model/useFavoritesStore';
import { useQuickAddFavorite } from '../model/useQuickAddFavorite';

export interface FavoritesListProps {
  onSelect?: () => void;
}

function FavoriteRow({
  favorite,
  onSelect,
}: {
  favorite: FavoriteFood;
  onSelect: (id: string) => void;
}) {
  const imageSrc = useMealImage(favorite.imageUri);

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full h-auto justify-start gap-3 py-2 px-3"
      onClick={() => onSelect(favorite.id)}
    >
      <div className="h-14 w-14 rounded-md bg-emerald-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {imageSrc ? (
          <img src={imageSrc} alt="" className="h-full w-full object-cover" />
        ) : (
          <Utensils className="h-5 w-5 text-emerald-600" />
        )}
      </div>
      <span className="flex-1 text-left font-medium truncate">{favorite.name}</span>
      <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
        {formatCalories(favorite.totalCalories)}
      </span>
    </Button>
  );
}

export function FavoritesList({ onSelect }: FavoritesListProps) {
  const favorites = useFavoritesStore((s) => s.favorites);
  const quickAdd = useQuickAddFavorite();

  if (favorites.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        Пока нет избранного. Добавьте блюдо на странице приёма.
      </p>
    );
  }

  function handleSelect(favoriteId: string) {
    const mealId = quickAdd(favoriteId);
    if (mealId) {
      onSelect?.();
    }
  }

  return (
    <div className="space-y-2">
      {favorites.map((favorite) => (
        <FavoriteRow
          key={favorite.id}
          favorite={favorite}
          onSelect={handleSelect}
        />
      ))}
    </div>
  );
}
