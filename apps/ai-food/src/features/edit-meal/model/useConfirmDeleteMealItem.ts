import { useState } from 'react';
import { useDiaryStore } from '@/entities/meal';

export interface PendingMealItem {
  mealId: string;
  itemId: string;
}

export function useConfirmDeleteMealItem() {
  const [pending, setPending] = useState<PendingMealItem | null>(null);

  function openConfirm(mealId: string, itemId: string) {
    setPending({ mealId, itemId });
  }

  function closeConfirm() {
    setPending(null);
  }

  function confirmDelete(): PendingMealItem | null {
    if (!pending) return null;
    const next = pending;
    useDiaryStore.getState().removeMealItem(next.mealId, next.itemId);
    setPending(null);
    return next;
  }

  return {
    pending,
    isOpen: pending !== null,
    openConfirm,
    closeConfirm,
    confirmDelete,
  };
}
