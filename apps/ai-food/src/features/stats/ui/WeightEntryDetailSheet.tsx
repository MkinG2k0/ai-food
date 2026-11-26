import { useEffect, useState } from 'react';
import { BottomSheet, Button } from '@/shared/ui';
import type { WeightEntry } from '../model/useWeightStore';

export interface WeightEntryDetailSheetProps {
  open: boolean;
  onClose: () => void;
  entry: WeightEntry | null;
  onDelete: (id: string) => void;
}

function formatEntryDate(ymd: string): string {
  return new Date(`${ymd}T12:00:00`).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function WeightEntryDetailSheet({
  open,
  onClose,
  entry,
  onDelete,
}: WeightEntryDetailSheetProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!open) setConfirmOpen(false);
  }, [open]);

  return (
    <>
      <BottomSheet open={open && !confirmOpen} onClose={onClose}>
        <div className="w-full space-y-4 px-2 py-2">
          <h2 className="text-lg font-semibold text-foreground">Запись веса</h2>
          {entry && (
            <>
              <div className="space-y-1">
                <p className="text-3xl font-semibold tabular-nums tracking-tight">
                  {entry.kg.toFixed(1)}
                  <span className="ml-1 text-base font-medium text-muted-foreground">
                    кг
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatEntryDate(entry.date)}
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={onClose}>
                  Закрыть
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => setConfirmOpen(true)}
                >
                  Удалить
                </Button>
              </div>
            </>
          )}
        </div>
      </BottomSheet>

      <BottomSheet
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
      >
        <div className="w-full space-y-4 px-2 py-2">
          <h2 className="text-lg font-semibold text-foreground">
            Удалить запись веса?
          </h2>
          <p className="text-sm text-muted-foreground">
            Это действие нельзя отменить. Запись будет удалена из журнала веса.
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
              onClick={() => {
                if (!entry) return;
                onDelete(entry.id);
                setConfirmOpen(false);
                onClose();
              }}
            >
              Удалить
            </Button>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
