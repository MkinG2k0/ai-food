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
        <div className="space-y-3 text-left">
          <p>
            В Яндекс.Браузере на рабочий стол обычно попадает только ссылка, а не
            полноценное приложение. Лучше открыть сайт в Chrome и установить
            оттуда.
          </p>
          <ol className="list-decimal space-y-2 pl-4">
            <li>Скопируйте адрес сайта и откройте его в Chrome</li>
            <li>Нажмите «Установить» в Chrome или в нашем экране установки</li>
          </ol>
        </div>
      ) : (
        <p className="text-left">
          В меню браузера выберите «Установить приложение» или «Добавить на
          главный экран». Если пункта нет — откройте сайт в Chrome на телефоне.
        </p>
      )}
    </div>
  );
}
