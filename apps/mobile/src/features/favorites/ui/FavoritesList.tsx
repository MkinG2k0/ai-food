import { useFavoritesStore } from '../model/useFavoritesStore';
import { useQuickAddFavorite } from '../model/useQuickAddFavorite';
import { formatCalories } from '@/shared/lib';
import { Button } from '@/shared/ui';

export interface FavoritesListProps {
  onSelect?: () => void;
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
        <Button
          key={favorite.id}
          type="button"
          variant="outline"
          className="w-full h-auto justify-between gap-3 py-3 px-4"
          onClick={() => handleSelect(favorite.id)}
        >
          <span className="text-left font-medium truncate">{favorite.name}</span>
          <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
            {formatCalories(favorite.totalCalories)}
          </span>
        </Button>
      ))}
    </div>
  );
}
