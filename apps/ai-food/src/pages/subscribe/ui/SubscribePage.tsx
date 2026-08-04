import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  fetchBillingStatus,
  subscribe,
  syncBilling,
  useSubscriptionPrice,
  validatePromo,
} from '@/features/billing';
import { useAuthStore } from '@/features/auth';
import { Button, SubpageShell } from '@/shared/ui';

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
  const [promoInput, setPromoInput] = useState('');
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState<{
    code: string;
    discountPercent: number;
    originalAmount: number;
    finalAmount: number;
  } | null>(null);
  const [pollStatus, setPollStatus] = useState<
    'idle' | 'polling' | 'active' | 'timeout'
  >('idle');

  const paymentId = searchParams.get('paymentId') ?? undefined;
  const isMock = searchParams.get('mock') === '1';
  const { data: price, isLoading: priceLoading, isError: priceError } =
    useSubscriptionPrice();
  const priceRub =
    price != null ? Math.round(price.amountKopecks / 100) : null;
  const durationDays = price?.durationDays;

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

  function clearAppliedIfEdited(next: string) {
    setPromoInput(next);
    if (applied && next.trim().toLowerCase() !== applied.code) {
      setApplied(null);
    }
  }

  async function handleApplyPromo() {
    if (!userToken) {
      navigate('/login', { replace: true, state: { from: '/subscribe' } });
      return;
    }
    setApplying(true);
    try {
      const result = await validatePromo(promoInput);
      setApplied({
        code: result.code,
        discountPercent: result.discountPercent,
        originalAmount: result.originalAmount,
        finalAmount: result.finalAmount,
      });
      setPromoInput(result.code);
      toast.success(`Скидка ${result.discountPercent}% применена`);
    } catch (err) {
      setApplied(null);
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Неверный промокод';
      toast.error(message);
    } finally {
      setApplying(false);
    }
  }

  async function handlePay() {
    if (!userToken) {
      navigate('/login', { replace: true, state: { from: '/subscribe' } });
      return;
    }
    setPaying(true);
    try {
      const result = await subscribe(applied?.code);
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
        onBack={() => navigate('/', { replace: true })}
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
        {applied ? (
          <p className="text-3xl font-semibold tabular-nums">
            <span className="mr-2 text-base font-normal text-muted-foreground line-through">
              {(applied.originalAmount / 100).toLocaleString('ru-RU')} ₽
            </span>
            {(applied.finalAmount / 100).toLocaleString('ru-RU')} ₽
            <span className="ml-2 text-base font-normal text-muted-foreground">
              / {durationDays != null ? `${durationDays} дн.` : 'срок'} (−
              {applied.discountPercent}%)
            </span>
          </p>
        ) : (
          <p className="text-3xl font-semibold tabular-nums">
            {priceLoading && (
              <span className="text-base font-normal text-muted-foreground">
                Загрузка цены…
              </span>
            )}
            {priceError && (
              <span className="text-base font-normal text-muted-foreground">
                Цена недоступна
              </span>
            )}
            {priceRub != null && (
              <>
                {priceRub.toLocaleString('ru-RU')} ₽
                <span className="ml-2 text-base font-normal text-muted-foreground">
                  / {durationDays != null ? `${durationDays} дн.` : 'срок'}
                </span>
              </>
            )}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Разовая оплата — доступ к AI на{' '}
          {durationDays != null ? `${durationDays} дней` : 'срок лицензии'}.
          Без автосписаний.
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

      <section className="space-y-2">
        <label htmlFor="promo" className="text-sm font-medium">
          Промокод
        </label>
        <div className="flex gap-2">
          <input
            id="promo"
            value={promoInput}
            onChange={(e) => clearAppliedIfEdited(e.target.value)}
            placeholder="Введите код"
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            autoComplete="off"
          />
          <Button
            type="button"
            variant="secondary"
            disabled={applying || !promoInput.trim()}
            onClick={() => void handleApplyPromo()}
          >
            {applying ? '…' : 'Применить'}
          </Button>
        </div>
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
