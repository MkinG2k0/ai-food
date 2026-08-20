import { useEffect, useState } from 'react';
import { Download, Loader2, Share } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/shared/ui';
import {
  isIosSafari,
  isYandexBrowser,
  shareOrCopyInstallUrl,
} from '../model/pwaInstallEnv';
import { usePwaInstallPrompt } from '../model/usePwaInstallPrompt';
import { ManualInstallHint } from './ManualInstallHint';

interface InstallAppScreenProps {
  onContinue: () => void;
}

type InstallPhase = 'offer' | 'waiting' | 'installed';

export function InstallAppScreen({ onContinue }: InstallAppScreenProps) {
  const { canPrompt, promptInstall } = usePwaInstallPrompt();
  const ios = isIosSafari();
  const yandex = isYandexBrowser();
  const [showHint, setShowHint] = useState(false);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<InstallPhase>('offer');

  useEffect(() => {
    const onInstalled = () => setPhase('installed');
    window.addEventListener('appinstalled', onInstalled);
    return () => window.removeEventListener('appinstalled', onInstalled);
  }, []);

  // If native prompt never arrives (typical Yandex), show Chrome path.
  useEffect(() => {
    if (ios || canPrompt) return;
    const t = window.setTimeout(() => setShowHint(true), 800);
    return () => window.clearTimeout(t);
  }, [ios, canPrompt]);

  async function handleChromePath() {
    setBusy(true);
    try {
      const result = await shareOrCopyInstallUrl();
      setShowHint(true);
      if (result === 'copied') {
        toast.message('Адрес скопирован', {
          description: 'Откройте Chrome → вставьте ссылку → Установить',
        });
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleInstall() {
    if (ios) {
      setShowHint(true);
      return;
    }

    // Yandex without deferred prompt: don't fake install — send to Chrome.
    if (!canPrompt) {
      await handleChromePath();
      return;
    }

    // Start prompt in the click turn before any await / setState side-effects.
    const outcomePromise = promptInstall();
    setBusy(true);
    try {
      const outcome = await outcomePromise;
      if (outcome === 'accepted') {
        setPhase('waiting');
        return;
      }
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

  const waiting = phase === 'waiting' || phase === 'installed';
  const useChromeCta = !ios && !canPrompt;

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
                (useChromeCta
                  ? 'В этом браузере полноценная установка часто недоступна. Откройте сайт в Chrome.'
                  : 'Добавьте AI Food на телефон — быстрее открывается и удобнее, как обычное приложение.')}
            </p>
          </div>
        </div>

        {phase === 'waiting' && (
          <div className="flex justify-center" aria-hidden>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {showHint && phase === 'offer' && <ManualInstallHint />}

        <div className="flex flex-col gap-3">
          {!waiting && (
            <Button
              size="lg"
              className="w-full gap-2"
              disabled={busy}
              onClick={() => void handleInstall()}
            >
              {useChromeCta ? (
                <Share className="h-4 w-4" aria-hidden />
              ) : (
                <Download className="h-4 w-4" aria-hidden />
              )}
              {ios
                ? showHint
                  ? 'Показать ещё раз'
                  : 'Как установить'
                : useChromeCta
                  ? 'Установить через Chrome'
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
