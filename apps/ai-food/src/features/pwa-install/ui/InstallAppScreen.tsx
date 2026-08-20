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

  // Yandex: always show Chrome tip. Others: only if native prompt is missing.
  useEffect(() => {
    if (ios) return;
    if (yandex) {
      setShowHint(true);
      return;
    }
    if (canPrompt) return;
    const t = window.setTimeout(() => setShowHint(true), 800);
    return () => window.clearTimeout(t);
  }, [ios, yandex, canPrompt]);

  async function handleFallbackInstall() {
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

    if (!canPrompt) {
      await handleFallbackInstall();
      return;
    }

    // Keep Yandex native install; Chrome tip is shown separately above.
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
      }
    } finally {
      setBusy(false);
    }
  }

  const waiting = phase === 'waiting' || phase === 'installed';
  // Only replace primary CTA when there is no native prompt at all.
  const useShareCta = !ios && !canPrompt;

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
                (yandex
                  ? 'Можно установить здесь, но лучше через Chrome — будет полноценное приложение, а не ссылка.'
                  : useShareCta
                    ? 'В этом браузере установка может быть недоступна. Откройте сайт в Chrome.'
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
              {useShareCta ? (
                <Share className="h-4 w-4" aria-hidden />
              ) : (
                <Download className="h-4 w-4" aria-hidden />
              )}
              {ios
                ? showHint
                  ? 'Показать ещё раз'
                  : 'Как установить'
                : useShareCta
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
