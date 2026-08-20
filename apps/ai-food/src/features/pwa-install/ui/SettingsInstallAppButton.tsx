import { useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/shared/ui';
import { isIosSafari, isYandexBrowser } from '../model/pwaInstallEnv';
import { usePwaInstallPrompt } from '../model/usePwaInstallPrompt';
import { ManualInstallHint } from './ManualInstallHint';

/** Compact install control for Settings (after first-visit skip). */
export function SettingsInstallAppButton() {
  const { canPrompt, promptInstall } = usePwaInstallPrompt();
  const ios = isIosSafari();
  const yandex = isYandexBrowser();
  const [showHint, setShowHint] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleInstall() {
    if (ios || !canPrompt) {
      setShowHint(true);
      return;
    }

    const outcomePromise = promptInstall();
    setBusy(true);
    try {
      const outcome = await outcomePromise;
      if (outcome === 'unavailable') {
        setShowHint(true);
        if (yandex) {
          toast.message('Установка в Яндексе недоступна', {
            description: 'Откройте сайт в Chrome',
          });
        }
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
