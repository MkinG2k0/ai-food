import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  fetchBillingStatus,
  subscribe,
  syncBilling,
} from '@/features/billing';
import { useAuthStore } from '@/features/auth';
import { Button, SubpageShell } from '@/shared/ui';

const PRICE_RUB = 1990;

function openPaymentUrl(url: string): void {
  window.location.assign(url);
}

export function SubscribePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const variant = searchParams.get('result'); // success | fail via query, or path
  const pathname =
    typeof window !== 'undefined' ? window.location.pathname : '';
  const isSuccess =
    pathname.endsWith('/subscribe/success') || variant === 'success';
  const isFail = pathname.endsWith('/subscribe/fail') || variant === 'fail';
  const userToken = useAuthStore((s) => s.userToken);
  const [paying, setPaying] = useState(false);
  const [pollStatus, setPollStatus] = useState<
    'idle' | 'polling' | 'active' | 'timeout'
  >('idle');

  const paymentId = searchParams.get('paymentId') ?? undefined;
  const isMock = searchParams.get('mock') === '1';

  const pollUntilActive = useCallback(async () => {
    setPollStatus('polling');
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      try {
        if (isMock && paymentId) {
          await syncBilling(paymentId);
        }
        const status = await fetchBillingStatus();
        if (status.hasActiveSubscription) {
          setPollStatus('active');
          toast.success('Лицензия активирована');
          return;
        }
      } catch {
        // keep polling
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    setPollStatus('timeout');
  }, [isMock, paymentId]);

  useEffect(() => {
    if (!isSuccess || !userToken) return;
    void pollUntilActive();
  }, [isSuccess, userToken, pollUntilActive]);

  async function handlePay() {
    if (!userToken) {
      navigate('/login', { replace: true, state: { from: '/subscribe' } });
      return;
    }
    setPaying(true);
    try {
      const result = await subscribe();
      openPaymentUrl(result.paymentUrl);
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Не удалось создать платёж';
      toast.error(message);
      setPaying(false);
    }
  }

  if (isSuccess) {
    return (
      <SubpageShell
        title="Оплата"
        onBack={() => navigate('/settings')}
        mainClassName="space-y-6"
      >
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Спасибо!</h2>
          {pollStatus === 'polling' && (
            <p className="text-sm text-muted-foreground">
              Проверяем оплату и активируем лицензию…
            </p>
          )}
          {pollStatus === 'active' && (
            <p className="text-sm text-muted-foreground">
              Годовая лицензия активна. AI-анализ и уточнение без лимита до
              окончания срока.
            </p>
          )}
          {pollStatus === 'timeout' && (
            <p className="text-sm text-muted-foreground">
              Оплата ещё не подтверждена. Обновите статус в настройках чуть
              позже или нажмите «Проверить снова».
            </p>
          )}
          <Button
            className="w-full"
            onClick={() => {
              if (pollStatus === 'timeout' || pollStatus === 'idle') {
                void pollUntilActive();
              } else {
                navigate('/', { replace: true });
              }
            }}
          >
            {pollStatus === 'timeout' || pollStatus === 'idle'
              ? 'Проверить снова'
              : 'На главную'}
          </Button>
        </section>
      </SubpageShell>
    );
  }

  if (isFail) {
    return (
      <SubpageShell
        title="Оплата"
        onBack={() => navigate('/subscribe')}
        mainClassName="space-y-6"
      >
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Оплата не прошла</h2>
          <p className="text-sm text-muted-foreground">
            Можно попробовать ещё раз. Дневник и ручной ввод по-прежнему
            бесплатны.
          </p>
          <Button className="w-full" onClick={() => navigate('/subscribe')}>
            Повторить оплату
          </Button>
        </section>
      </SubpageShell>
    );
  }

  return (
    <SubpageShell
      title="Подписка"
      onBack={() => navigate(-1)}
      mainClassName="space-y-6"
    >
      <section className="space-y-3">
        <p className="text-3xl font-semibold tabular-nums">
          {PRICE_RUB.toLocaleString('ru-RU')} ₽
          <span className="ml-2 text-base font-normal text-muted-foreground">
            / год
          </span>
        </p>
        <p className="text-sm text-muted-foreground">
          Разовая оплата — доступ к AI на 365 дней. Без автосписаний.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Входит в лицензию</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>AI-анализ фото и описания без лимита</li>
          <li>AI-уточнение («Дополнить») без лимита</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Всегда бесплатно</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Дневник приёмов пищи</li>
          <li>Ручной ввод и штрихкод</li>
          <li>Статистика, настройки, онбординг</li>
        </ul>
      </section>

      <Button
        className="w-full"
        disabled={paying}
        onClick={() => void handlePay()}
      >
        {paying ? 'Создаём платёж…' : 'Оплатить'}
      </Button>

      {!userToken && (
        <p className="text-center text-xs text-muted-foreground">
          Для оплаты нужен вход через Telegram
        </p>
      )}
    </SubpageShell>
  );
}
