import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/shared/ui';
import { isIosSafari, isYandexBrowser } from '../model/pwaInstallEnv';
import { usePwaInstallPrompt } from '../model/usePwaInstallPrompt';
import { ManualInstallHint } from './ManualInstallHint';

/** Compact install control for Settings (after first-visit skip). */
export function SettingsInstallAppButton() {
  const { canPrompt, promptInstall } = usePwaInstallPrompt();
  const ios = isIosSafari();
  const yandex = isYandexBrowser();
  const [showHint, setShowHint] = useState(yandex);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (yandex) setShowHint(true);
  }, [yandex]);

  async function handleInstall() {
    if (ios) {
      setShowHint(true);
      return;
    }

    if (!canPrompt) {
      setShowHint(true);
      return;
    }

    const outcomePromise = promptInstall();
    setBusy(true);
    try {
      const outcome = await outcomePromise;
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
      {showHint && <ManualInstallHint />}
    </div>
  );
}
