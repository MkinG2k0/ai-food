import { useState, useCallback } from 'react';
import { useDiaryStore } from '@/entities/meal';

export function useConfirmDeleteMeal() {
  const [pendingId, setPendingId] = useState<string | null>(null);

  const openConfirm = useCallback((id: string) => {
    setPendingId(id);
  }, []);

  const closeConfirm = useCallback(() => {
    setPendingId(null);
  }, []);

  const confirmDelete = useCallback((): string | null => {
    if (!pendingId) return null;
    const id = pendingId;
    useDiaryStore.getState().removeMeal(id);
    setPendingId(null);
    return id;
  }, [pendingId]);

  return {
    pendingId,
    isOpen: pendingId !== null,
    openConfirm,
    closeConfirm,
    confirmDelete,
  };
}
