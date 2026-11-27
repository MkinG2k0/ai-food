import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/shared/ui';
import { applyClientDebugSnapshot } from '../model/clientDebugSnapshot';

/** Dev-only. Replaces local storage, IndexedDB and meal files, then reloads. */
export function DevLoadClientSnapshotButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!import.meta.env.DEV) return null;

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setIsLoading(true);
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      await applyClientDebugSnapshot(parsed);
      window.location.reload();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Не удалось загрузить данные',
      );
      setIsLoading(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={isLoading}
        onClick={() => inputRef.current?.click()}
      >
        {isLoading ? 'Загрузка…' : 'Загрузить данные'}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          void handleFile(file);
        }}
      />
    </>
  );
}
