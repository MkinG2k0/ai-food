import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  submitDataConsent,
  useAuthHydrated,
  useAuthStore,
} from '@/features/auth';
import { getLegalUrl } from '@/shared/lib';
import { Button } from '@/shared/ui';

type ConsentLocationState = {
  from?: string;
};

export function ConsentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const hydrated = useAuthHydrated();
  const userToken = useAuthStore((state) => state.userToken);
  const dataConsentAt = useAuthStore((state) => state.dataConsentAt);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const privacyUrl = getLegalUrl('/privacy');

  if (!hydrated) return null;

  if (!userToken) {
    return <Navigate to="/login" replace />;
  }
  if (dataConsentAt) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async () => {
    if (!accepted || submitting) return;
    setSubmitting(true);
    try {
      await submitDataConsent();
      const from = (location.state as ConsentLocationState | null)?.from;
      navigate(from && from !== '/consent' ? from : '/', { replace: true });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Не удалось сохранить согласие',
      );
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-dvh flex-col bg-zinc-50 px-5 py-8">
      <div className="my-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Согласие на обработку данных
          </h1>
          <p className="text-sm text-muted-foreground">
            Для работы аккаунта мы обрабатываем:
          </p>
        </header>

        <ul className="list-disc space-y-2 pl-5 text-sm">
          <li>Telegram-аккаунт</li>
          <li>deviceId</li>
          <li>
            статистику действий по типу (фото, текст, ручной ввод, штрихкод и
            уточнения) — сами фото не сохраняются
          </li>
          <li>платежи и подписку</li>
          <li>технические логи</li>
        </ul>

        <p className="rounded-md border border-border bg-card p-4 text-sm">
          Дневник и КБЖУ остаются на устройстве. Сами фото еды не сохраняются.
        </p>

        {privacyUrl ? (
          <a
            className="inline-block text-sm font-medium text-primary underline underline-offset-4"
            href={privacyUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Политика конфиденциальности
          </a>
        ) : (
          <span className="text-sm text-muted-foreground">
            Политика конфиденциальности
          </span>
        )}

        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-card p-4 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-primary"
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
          />
          <span>Согласен на обработку указанных данных</span>
        </label>

        <Button
          className="w-full"
          disabled={!accepted || submitting}
          onClick={() => void handleSubmit()}
        >
          {submitting ? 'Сохраняем…' : 'Продолжить'}
        </Button>
      </div>
    </main>
  );
}
