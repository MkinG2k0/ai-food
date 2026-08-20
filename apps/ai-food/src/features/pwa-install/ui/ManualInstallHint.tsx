import { useState, type MouseEvent } from 'react';
import { Share } from 'lucide-react';
import { toast } from 'sonner';
import { getManualInstallHint, openInChrome } from '../model/pwaInstallEnv';

/** Fallback UI when `beforeinstallprompt` is missing (iOS / Yandex / etc.). */
export function ManualInstallHint() {
  const { kind } = getManualInstallHint();
  const [openingChrome, setOpeningChrome] = useState(false);

  async function handleOpenChrome(e: MouseEvent) {
    e.preventDefault();
    if (openingChrome) return;
    setOpeningChrome(true);
    try {
      const result = await openInChrome();
      if (result === 'copied') {
        toast.message('Адрес скопирован', {
          description:
            'Яндекс не даёт открыть Chrome сам. Вставьте ссылку в Chrome и установите там.',
        });
      }
    } finally {
      setOpeningChrome(false);
    }
  }

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
            <li>
              <button
                type="button"
                className="font-medium text-primary underline underline-offset-2 disabled:opacity-60"
                disabled={openingChrome}
                onClick={(e) => void handleOpenChrome(e)}
              >
                {openingChrome ? 'Открываем…' : 'Открыть в Chrome'}
              </button>
            </li>
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
