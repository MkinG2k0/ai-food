import { useState } from 'react';
import { abortMealAnalyze, useDiaryStore } from '@/entities/meal';

export function useConfirmDeleteMeal() {
  const [pendingId, setPendingId] = useState<string | null>(null);

  function openConfirm(id: string) {
    setPendingId(id);
  }

  function closeConfirm() {
    setPendingId(null);
  }

  function confirmDelete(): string | null {
    if (!pendingId) return null;
    const id = pendingId;
    abortMealAnalyze(id);
    useDiaryStore.getState().removeMeal(id);
    setPendingId(null);
    return id;
  }

  return {
    pendingId,
    isOpen: pendingId !== null,
    openConfirm,
    closeConfirm,
    confirmDelete,
  };
}
