import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import {
  applyAppUpdate,
  checkForAppUpdate,
} from '../model/pwaUpdate';

export function useCheckAppUpdate() {
  const [checking, setChecking] = useState(false);
  const [updateSheetOpen, setUpdateSheetOpen] = useState(false);
  const [applying, setApplying] = useState(false);

  const checkForUpdate = useCallback(async () => {
    if (checking || applying) return;
    setChecking(true);
    try {
      const result = await checkForAppUpdate();
      if (result === 'available') {
        setUpdateSheetOpen(true);
        return;
      }
      if (result === 'uptodate') {
        toast.success('У вас актуальная версия');
        return;
      }
      if (result === 'unsupported') {
        toast.message('Проверка обновлений недоступна', {
          description: 'Обновите страницу вручную, если интерфейс выглядит устаревшим.',
        });
        return;
      }
      toast.error('Не удалось проверить обновления');
    } finally {
      setChecking(false);
    }
  }, [applying, checking]);

  const applyUpdate = useCallback(async () => {
    if (applying) return;
    setApplying(true);
    try {
      await applyAppUpdate();
    } catch {
      setApplying(false);
      toast.error('Не удалось обновить. Попробуйте обновить страницу вручную.');
    }
  }, [applying]);

  const closeUpdateSheet = useCallback(() => {
    if (applying) return;
    setUpdateSheetOpen(false);
  }, [applying]);

  return {
    checking,
    applying,
    updateSheetOpen,
    checkForUpdate,
    applyUpdate,
    closeUpdateSheet,
  };
}
