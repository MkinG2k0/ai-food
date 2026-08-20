import { useState } from 'react';
import { Download, Share } from 'lucide-react';
import { Button } from '@/shared/ui';
import { isIosSafari } from '../model/pwaInstallEnv';
import { usePwaInstallPrompt } from '../model/usePwaInstallPrompt';

/** Compact install control for Settings (after first-visit skip). */
export function SettingsInstallAppButton() {
  const { promptInstall } = usePwaInstallPrompt();
  const ios = isIosSafari();
  const [showHint, setShowHint] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleInstall() {
    if (ios) {
      setShowHint(true);
      return;
    }

    setBusy(true);
    try {
      const outcome = await promptInstall();
      if (outcome === 'unavailable') {
        setShowHint(true);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        className="w-full justify-between gap-2"
        disabled={busy}
        onClick={() => void handleInstall()}
      >
        <span className="flex items-center gap-2">
          <Download className="h-4 w-4 shrink-0" aria-hidden />
          Установить приложение
        </span>
      </Button>
      {showHint && (
        <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-foreground">
          {ios ? (
            <ol className="list-decimal space-y-2 pl-4 text-left">
              <li>
                Нажмите{' '}
                <Share className="inline h-4 w-4 align-text-bottom" aria-hidden />{' '}
                «Поделиться» внизу Safari
              </li>
              <li>Выберите «На экран „Домой“»</li>
              <li>Подтвердите «Добавить»</li>
            </ol>
          ) : (
            <p className="text-left">
              В меню браузера выберите «Установить приложение» или «Добавить на
              главный экран». Если пункта нет — откройте сайт в Chrome на
              телефоне.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
