import { useEffect, useRef, useState } from 'react';
import {
  getTelegramBotUsername,
  signInWithTelegram,
  type TelegramLoginPayload,
} from '../api/signInWithTelegram';

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramLoginPayload) => void;
  }
}

type TelegramLoginButtonProps = {
  onSuccess: () => void;
  onError: (message: string) => void;
};

/**
 * Official Telegram Login Widget (works on BotFather Login Widget domain).
 */
export function TelegramLoginButton({ onSuccess, onError }: TelegramLoginButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const botUsername = getTelegramBotUsername();
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !botUsername) return;

    window.onTelegramAuth = (user: TelegramLoginPayload) => {
      setBusy(true);
      void signInWithTelegram(user)
        .then(() => onSuccessRef.current())
        .catch((err: unknown) => {
          const message =
            err instanceof Error ? err.message : 'Не удалось войти через Telegram';
          onErrorRef.current(message);
        })
        .finally(() => setBusy(false));
    };

    el.innerHTML = '';
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '8');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    el.appendChild(script);

    return () => {
      delete window.onTelegramAuth;
      el.innerHTML = '';
    };
  }, [botUsername]);

  if (!botUsername) {
    return (
      <p className="text-sm text-muted-foreground">
        Задайте <code className="text-xs">VITE_TELEGRAM_BOT_USERNAME</code> в
        .env, чтобы показать Telegram Login.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="flex min-h-[40px] justify-center [color-scheme:light] [&_iframe]:bg-transparent"
        aria-busy={busy}
      />
      {busy && (
        <p className="text-center text-sm text-muted-foreground">Входим…</p>
      )}
    </div>
  );
}
