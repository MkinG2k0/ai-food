import { RefreshCw } from 'lucide-react';
import { cn } from '@/shared/lib';
import { Button } from '@/shared/ui';
import { useCheckAppUpdate } from '../model/useCheckAppUpdate';
import { UpdateAvailableSheet } from './UpdateAvailableSheet';

export interface SettingsCheckUpdateButtonProps {
  /** `inline` — компактная ссылка в одной строке с версией. */
  variant?: 'button' | 'row' | 'inline';
  className?: string;
}

/** Web-only control: check service worker for a newer site build. */
export function SettingsCheckUpdateButton({
  variant = 'button',
  className,
}: SettingsCheckUpdateButtonProps = {}) {
  const {
    checking,
    applying,
    updateSheetOpen,
    checkForUpdate,
    applyUpdate,
    closeUpdateSheet,
  } = useCheckAppUpdate();

  const busy = checking || applying;
  const label = checking ? 'Проверяем…' : 'Проверить обновления';

  return (
    <>
      {variant === 'inline' ? (
        <button
          type="button"
          disabled={busy}
          className={cn(
            'inline-flex items-center gap-1.5 text-sm font-medium text-primary disabled:opacity-60',
            className,
          )}
          onClick={() => void checkForUpdate()}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 shrink-0 ${checking ? 'animate-spin' : ''}`}
            aria-hidden
          />
          {label}
        </button>
      ) : variant === 'row' ? (
        <button
          type="button"
          disabled={busy}
          className={cn(
            'flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-muted/50 disabled:opacity-60',
            className,
          )}
          onClick={() => void checkForUpdate()}
        >
          <RefreshCw
            className={`h-4 w-4 shrink-0 text-muted-foreground ${
              checking ? 'animate-spin' : ''
            }`}
            aria-hidden
          />
          {label}
        </button>
      ) : (
        <Button
          variant="outline"
          className={cn('w-full justify-between gap-2', className)}
          disabled={busy}
          onClick={() => void checkForUpdate()}
        >
          <span className="flex items-center gap-2">
            <RefreshCw
              className={`h-4 w-4 shrink-0 ${checking ? 'animate-spin' : ''}`}
              aria-hidden
            />
            {label}
          </span>
        </Button>
      )}
      <UpdateAvailableSheet
        open={updateSheetOpen}
        onClose={closeUpdateSheet}
        onUpdate={() => void applyUpdate()}
        busy={applying}
      />
    </>
  );
}
