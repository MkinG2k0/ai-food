import { BottomSheet, Button } from '@/shared/ui';

export interface UpdateAvailableSheetProps {
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
  busy?: boolean;
}

export function UpdateAvailableSheet({
  open,
  onClose,
  onUpdate,
  busy = false,
}: UpdateAvailableSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="w-full space-y-4 px-2 py-2">
        <h2 className="text-lg font-semibold text-foreground">
          Доступно обновление
        </h2>
        <p className="text-sm text-muted-foreground">
          Есть новая версия сайта. Обновите страницу, чтобы подтянуть свежий
          интерфейс и исправления.
        </p>
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            disabled={busy}
            onClick={onClose}
          >
            Позже
          </Button>
          <Button
            className="flex-1"
            disabled={busy}
            onClick={onUpdate}
          >
            {busy ? 'Обновляем…' : 'Обновить'}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
