import { useState } from 'react';
import { abortMealAnalyze, useDiaryStore } from '@/entities/meal';
import { queueDiarySync } from '@/features/diary-sync';

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
    useDiaryStore.getState().recordPendingDelete(id);
    setPendingId(null);
    queueDiarySync({ mode: 'delete', mealIds: [id] });
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
