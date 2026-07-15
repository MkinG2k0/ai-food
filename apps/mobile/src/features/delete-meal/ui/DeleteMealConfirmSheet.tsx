import { BottomSheet, Button } from '@/shared/ui';

export interface DeleteMealConfirmSheetProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteMealConfirmSheet({
  open,
  onClose,
  onConfirm,
}: DeleteMealConfirmSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="w-full space-y-4 px-2 py-2">
        <h2 className="text-lg font-semibold text-foreground">
          Удалить приём пищи?
        </h2>
        <p className="text-sm text-muted-foreground">
          Это действие нельзя отменить. Приём пищи будет удалён из дневника.
        </p>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="destructive" className="flex-1" onClick={onConfirm}>
            Удалить
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
