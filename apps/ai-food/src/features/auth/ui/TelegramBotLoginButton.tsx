import { useEffect, useRef, useState } from 'react';
import { Button } from '@/shared/ui';
import type { AuthLoginResult } from '../model/authLoginResult';
import { prepareTelegramLoginPopup } from '../api/openTelegramBotDeepLink';
import { signInWithTelegramBot } from '../api/signInWithTelegramBot';

type TelegramBotLoginButtonProps = {
  onSuccess: (result: AuthLoginResult) => void;
  onError: (message: string) => void;
};

export function TelegramBotLoginButton({
  onSuccess,
  onError,
}: TelegramBotLoginButtonProps) {
  const [busy, setBusy] = useState(false);
  const [botDeepLink, setBotDeepLink] = useState<string | null>(null);
  const [needsManualOpen, setNeedsManualOpen] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      controllerRef.current?.abort();
    },
    [],
  );

  const handleLogin = async () => {
    const controller = new AbortController();
    controllerRef.current = controller;
    setBusy(true);
    setBotDeepLink(null);
    setNeedsManualOpen(false);

    // B: capture user gesture before any await (critical for iOS Safari / PWA).
    const popup = prepareTelegramLoginPopup();

    try {
      const result = await signInWithTelegramBot({
        signal: controller.signal,
        popup,
        onDeepLinkReady: (url) => setBotDeepLink(url),
        onNeedsManualOpen: () => setNeedsManualOpen(true),
      });
      onSuccess(result);
    } catch (error) {
      if (!controller.signal.aborted) {
        onError(
          error instanceof Error
            ? error.message
            : 'Не удалось войти через Telegram',
        );
      }
    } finally {
      if (!controller.signal.aborted) {
        setBusy(false);
        setBotDeepLink(null);
        setNeedsManualOpen(false);
      }
    }
  };

  return (
    <div className="space-y-3">
      <Button
        className="w-full"
        disabled={busy}
        onClick={() => void handleLogin()}
      >
        {busy
          ? 'Ожидаем подтверждение в Telegram…'
          : 'Войти через Telegram'}
      </Button>

      {busy && botDeepLink ? (
        <div className="space-y-2">
          <p className="text-center text-xs text-muted-foreground">
            {needsManualOpen
              ? 'Автооткрытие заблокировано (часто в ярлыке на iPhone). Нажмите кнопку ниже:'
              : 'Если Telegram не открылся — нажмите:'}
          </p>
          <Button
            asChild
            variant={needsManualOpen ? 'default' : 'outline'}
            className="w-full"
          >
            <a href={botDeepLink} target="_blank" rel="noopener noreferrer">
              Открыть Telegram
            </a>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
