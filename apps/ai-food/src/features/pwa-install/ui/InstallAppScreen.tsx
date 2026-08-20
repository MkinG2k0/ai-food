import { useEffect, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui';
import { isIosSafari } from '../model/pwaInstallEnv';
import { usePwaInstallPrompt } from '../model/usePwaInstallPrompt';
import { ManualInstallHint } from './ManualInstallHint';

interface InstallAppScreenProps {
  onContinue: () => void;
}

type InstallPhase = 'offer' | 'waiting' | 'installed';

export function InstallAppScreen({ onContinue }: InstallAppScreenProps) {
  const { promptInstall } = usePwaInstallPrompt();
  const ios = isIosSafari();
  const [showIosHint, setShowIosHint] = useState(false);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<InstallPhase>('offer');

  useEffect(() => {
    const onInstalled = () => setPhase('installed');
    window.addEventListener('appinstalled', onInstalled);
    return () => window.removeEventListener('appinstalled', onInstalled);
  }, []);

  async function handleInstall() {
    if (ios) {
      setShowIosHint(true);
      return;
    }

    setBusy(true);
    try {
      const outcome = await promptInstall();
      if (outcome === 'accepted') {
        setPhase('waiting');
        return;
      }
      if (outcome === 'unavailable') {
        setShowIosHint(true);
      }
    } finally {
      setBusy(false);
    }
  }

  const waiting = phase === 'waiting' || phase === 'installed';

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
              {waiting
                ? phase === 'installed'
                  ? 'Готово'
                  : 'Установка…'
                : 'Установить как приложение'}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {phase === 'waiting' &&
                'Дождитесь установки на рабочий стол телефона. Затем откройте AI Food с иконки — так удобнее.'}
              {phase === 'installed' &&
                'Приложение на рабочем столе. Откройте его с иконки, чтобы продолжить.'}
              {phase === 'offer' &&
                'Добавьте AI Food на телефон — быстрее открывается и удобнее, как обычное приложение.'}
            </p>
          </div>
        </div>

        {phase === 'waiting' && (
          <div className="flex justify-center" aria-hidden>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {showIosHint && phase === 'offer' && <ManualInstallHint />}

        <div className="flex flex-col gap-3">
          {!waiting && (
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
          )}
          <Button
            size="lg"
            variant={waiting ? 'outline' : 'ghost'}
            className="w-full"
            disabled={busy}
            onClick={onContinue}
          >
            {waiting ? 'Продолжить в браузере' : 'Пропустить'}
          </Button>
        </div>
      </div>
    </div>
  );
}
