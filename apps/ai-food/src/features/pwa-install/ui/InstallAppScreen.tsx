import { useState } from 'react';
import { Download, Share } from 'lucide-react';
import { Button } from '@/shared/ui';
import { isIosSafari } from '../model/pwaInstallEnv';
import { usePwaInstallPrompt } from '../model/usePwaInstallPrompt';

interface InstallAppScreenProps {
  onContinue: () => void;
}

export function InstallAppScreen({ onContinue }: InstallAppScreenProps) {
  const { promptInstall } = usePwaInstallPrompt();
  const ios = isIosSafari();
  const [showIosHint, setShowIosHint] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleInstall() {
    if (ios) {
      setShowIosHint(true);
      return;
    }

    setBusy(true);
    try {
      const outcome = await promptInstall();
      if (outcome === 'accepted') {
        onContinue();
        return;
      }
      if (outcome === 'unavailable') {
        setShowIosHint(true);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-background px-6 py-8">
      <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col justify-center gap-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <img
            src="/pwa-192x192.png"
            alt=""
            width={88}
            height={88}
            className="rounded-2xl shadow-sm"
          />
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Установить как приложение
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Добавьте AI Food на телефон — быстрее открывается и удобнее, как
              обычное приложение.
            </p>
          </div>
        </div>

        {showIosHint && (
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

        <div className="flex flex-col gap-3">
          <Button
            size="lg"
            className="w-full gap-2"
            disabled={busy}
            onClick={() => void handleInstall()}
          >
            <Download className="h-4 w-4" aria-hidden />
            {ios
              ? showIosHint
                ? 'Показать ещё раз'
                : 'Как установить'
              : 'Установить'}
          </Button>
          <Button
            size="lg"
            variant="ghost"
            className="w-full"
            disabled={busy}
            onClick={onContinue}
          >
            Пропустить
          </Button>
        </div>
      </div>
    </div>
  );
}
