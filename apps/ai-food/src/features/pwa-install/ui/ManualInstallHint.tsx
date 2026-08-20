import { useState, type MouseEvent } from 'react';
import { Share } from 'lucide-react';
import { toast } from 'sonner';
import {
  getManualInstallHint,
  shareOrCopyInstallUrl,
} from '../model/pwaInstallEnv';

/** Fallback UI when `beforeinstallprompt` is missing (iOS / Yandex / etc.). */
export function ManualInstallHint() {
  const { kind } = getManualInstallHint();
  const [busy, setBusy] = useState(false);

  async function handleShareToChrome(e: MouseEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const result = await shareOrCopyInstallUrl();
      if (result === 'copied') {
        toast.message('Адрес скопирован', {
          description: 'Откройте Chrome → вставьте ссылку → Установить',
        });
      }
    } finally {
      setBusy(false);
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
            В Яндекс.Браузере на рабочий стол обычно попадает только ссылка.
            Полноценное приложение ставится из Chrome.
          </p>
          <ol className="list-decimal space-y-2 pl-4">
            <li>
              Нажмите{' '}
              <button
                type="button"
                className="font-medium text-primary underline underline-offset-2 disabled:opacity-60"
                disabled={busy}
                onClick={(e) => void handleShareToChrome(e)}
              >
                {busy ? 'Открываем…' : 'Поделиться ссылкой'}
              </button>{' '}
              → выберите Chrome
            </li>
            <li>Либо скопируйте адрес и вставьте в Chrome вручную</li>
            <li>В Chrome нажмите «Установить»</li>
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
