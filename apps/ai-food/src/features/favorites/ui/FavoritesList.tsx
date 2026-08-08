import { useRef, useState } from 'react';
import { Utensils, Trash2 } from 'lucide-react';
import { motion, useMotionValue, animate, type PanInfo } from 'framer-motion';
import { toast } from 'sonner';
import {
  FoodMacrosBadges,
  resolveMealImageUris,
  useMealImage,
} from '@/entities/meal';
import { BottomSheet, Button, Card, CardContent } from '@/shared/ui';
import type { FavoriteFood } from '../model/favoriteFood';
import { useFavoritesStore } from '../model/useFavoritesStore';
import { useQuickAddFavorite } from '../model/useQuickAddFavorite';

const SWIPE_OFFSET_THRESHOLD = 80;
const SWIPE_VELOCITY_THRESHOLD = 500;
const DRAG_CLICK_GUARD = 10;
const REVEAL_WIDTH = 96;

export interface FavoritesListProps {
  onSelect?: () => void;
}

function favoriteTotals(favorite: FavoriteFood) {
  return favorite.items.reduce(
    (acc, item) => ({
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
      fiber: acc.fiber + (item.fiber ?? 0),
    }),
    { protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );
}

function FavoriteCard({
  favorite,
  onSelect,
}: {
  favorite: FavoriteFood;
  onSelect: (id: string) => void;
}) {
  const imageSrc = useMealImage(favorite.imageUri);
  const photoCount = resolveMealImageUris(favorite).length;
  const totals = favoriteTotals(favorite);

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onSelect(favorite.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(favorite.id);
        }
      }}
      aria-label={favorite.name}
      className="relative cursor-pointer overflow-hidden"
    >
      <CardContent className="relative z-10 flex justify-between flex-auto gap-3 p-2">
        <div className="relative h-20 w-20 rounded-md bg-emerald-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {imageSrc ? (
            <img src={imageSrc} alt="" className="h-full w-full object-cover" />
          ) : (
            <Utensils className="h-6 w-6 text-emerald-600" />
          )}
          {photoCount > 1 && (
            <span className="absolute bottom-1 right-1 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-medium leading-none text-white">
              {photoCount}
            </span>
          )}
        </div>

        <div className="flex flex-col flex-1 min-w-0 space-y-1.5 justify-between">
          <div className="flex gap-2 justify-between text-sm font-medium min-w-0">
            <span className="truncate">{favorite.name}</span>
          </div>
          <FoodMacrosBadges
            density="compact"
            calories={favorite.totalCalories}
            protein={totals.protein}
            fat={totals.fat}
            carbs={totals.carbs}
            fiber={totals.fiber}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function SwipeableFavoriteCard({
  favorite,
  onSelect,
}: {
  favorite: FavoriteFood;
  onSelect: (id: string) => void;
}) {
  const x = useMotionValue(0);
  const didDrag = useRef(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const removeFavorite = useFavoritesStore((s) => s.removeFavorite);

  function handleDragStart() {
    didDrag.current = false;
  }

  function handleDrag(
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) {
    if (Math.abs(info.offset.x) > DRAG_CLICK_GUARD) {
      didDrag.current = true;
    }
  }

  function handleDragEnd(
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) {
    const shouldConfirm =
      info.offset.x < -SWIPE_OFFSET_THRESHOLD ||
      info.velocity.x < -SWIPE_VELOCITY_THRESHOLD;

    animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });

    if (shouldConfirm) {
      setConfirmOpen(true);
    }
  }

  function handleClickCapture(e: React.MouseEvent) {
    if (didDrag.current) {
      e.preventDefault();
      e.stopPropagation();
      didDrag.current = false;
    }
  }

  function handleConfirmDelete() {
    removeFavorite(favorite.id);
    setConfirmOpen(false);
    toast.success('Удалено из избранного');
  }

  return (
    <>
      <div className="relative overflow-hidden rounded-xl">
        <div
          className="absolute inset-y-0 right-0 flex w-24 items-center justify-center rounded-l-xl bg-destructive"
          aria-hidden
        >
          <Trash2 className="h-5 w-5 text-destructive-foreground" />
        </div>
        <motion.div
          drag="x"
          style={{ x }}
          dragConstraints={{ left: -REVEAL_WIDTH, right: 0 }}
          dragElastic={0.15}
          dragMomentum={false}
          onDragStart={handleDragStart}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          onClickCapture={handleClickCapture}
          className="relative touch-pan-y bg-background"
        >
          <FavoriteCard favorite={favorite} onSelect={onSelect} />
        </motion.div>
      </div>

      <BottomSheet open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <div className="w-full space-y-4 px-2 py-2">
          <h2 className="text-lg font-semibold text-foreground">
            Удалить из избранного?
          </h2>
          <p className="text-sm text-muted-foreground">
            «{favorite.name}» будет убрано из списка избранного.
          </p>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setConfirmOpen(false)}
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleConfirmDelete}
            >
              Удалить
            </Button>
          </div>
        </div>
      </BottomSheet>
    </>
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
        <SwipeableFavoriteCard
          key={favorite.id}
          favorite={favorite}
          onSelect={handleSelect}
        />
      ))}
    </div>
  );
}
