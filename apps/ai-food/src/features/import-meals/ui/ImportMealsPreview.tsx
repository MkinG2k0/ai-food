import type { ImportPreviewRow } from '../model/types';
import { Button } from '@/shared/ui';

export interface ImportMealsPreviewProps {
  rows: ImportPreviewRow[];
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}

export function ImportMealsPreview({
  rows,
  onConfirm,
  onCancel,
  busy = false,
}: ImportMealsPreviewProps) {
  const toAdd = rows.filter((row) => row.status === 'new').length;
  const skipped = rows.length - toAdd;

  return (
    <div className="flex h-full flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Будет добавлено {toAdd} · пропущено {skipped}
      </p>

      {toAdd === 0 && rows.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          Все записи уже есть в дневнике
        </p>
      ) : null}

      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {rows.map((row, index) => (
          <li
            key={`${row.date}-${row.time}-${row.name}-${row.calories}-${index}`}
            className="rounded-md border border-border bg-background px-3 py-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-0.5">
                <p className="text-xs text-muted-foreground">
                  {row.date} · {row.time}
                </p>
                <p className="truncate text-sm font-medium">{row.name}</p>
                <p className="text-xs text-muted-foreground">
                  {row.calories} ккал
                </p>
              </div>
              {row.status === 'duplicate' ? (
                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                  уже есть
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          className="w-full"
          disabled={toAdd === 0 || busy}
          onClick={onConfirm}
        >
          Добавить {toAdd}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={busy}
          onClick={onCancel}
        >
          Отмена
        </Button>
      </div>
    </div>
  );
}
