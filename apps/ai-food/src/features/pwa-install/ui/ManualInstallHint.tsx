import { Share } from 'lucide-react';
import { getManualInstallHint } from '../model/pwaInstallEnv';

/** Fallback UI when `beforeinstallprompt` is missing (iOS / Yandex / etc.). */
export function ManualInstallHint() {
  const { kind } = getManualInstallHint();

  return (
    <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-foreground">
      {kind === 'ios' ? (
        <ol className="list-decimal space-y-2 pl-4 text-left">
          <li>
            Нажмите{' '}
            <Share className="inline h-4 w-4 align-text-bottom" aria-hidden />{' '}
            «Поделиться» внизу Safari
          </li>
          <li>Выберите «На экран „Домой“»</li>
          <li>Подтвердите «Добавить»</li>
        </ol>
      ) : kind === 'yandex' ? (
        <ol className="list-decimal space-y-2 pl-4 text-left">
          <li>Откройте меню ⋮ в правом нижнем углу Яндекс.Браузера</li>
          <li>
            Выберите «Установить» / «Добавить на рабочий стол» / «На экран
            Домой»
          </li>
          <li>Подтвердите установку</li>
        </ol>
      ) : (
        <p className="text-left">
          В меню браузера выберите «Установить приложение» или «Добавить на
          главный экран». Если пункта нет — откройте сайт в Chrome на телефоне.
        </p>
      )}
    </div>
  );
}
