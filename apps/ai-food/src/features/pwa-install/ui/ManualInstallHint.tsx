import { useState, type MouseEvent } from 'react';
import { Share } from 'lucide-react';
import { toast } from 'sonner';
import {
  getManualInstallHint,
  shareOrCopyInstallUrl,
} from '../model/pwaInstallEnv';

/** Fallback / advisory UI when install needs manual steps (iOS / Yandex tip / etc.). */
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
        <div className="space-y-2 text-left">
          <p>
            Лучше установить через Chrome: в Яндексе на рабочий стол часто
            попадает только ссылка, а не полноценное приложение.
          </p>
          <p>
            <button
              type="button"
              className="font-medium text-primary underline underline-offset-2 disabled:opacity-60"
              disabled={busy}
              onClick={(e) => void handleShareToChrome(e)}
            >
              {busy ? 'Открываем…' : 'Открыть / поделиться в Chrome'}
            </button>
          </p>
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
