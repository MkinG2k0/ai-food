import { useEffect, useRef, useState } from 'react';
import { Button } from '@/shared/ui';
import type { AuthLoginResult } from '../model/authLoginResult';
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

    try {
      const result = await signInWithTelegramBot({
        signal: controller.signal,
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
      }
    }
  };

  return (
    <Button className="w-full" disabled={busy} onClick={() => void handleLogin()}>
      {busy
        ? 'Ожидаем подтверждение в Telegram…'
        : 'Войти через Telegram'}
    </Button>
  );
}
