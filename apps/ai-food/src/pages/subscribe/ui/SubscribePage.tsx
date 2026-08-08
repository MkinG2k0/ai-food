import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Camera,
  Check,
  ChevronDown,
  MessageSquarePlus,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react';
import {
  fetchBillingStatus,
  subscribe,
  syncBilling,
  useSubscriptionPrice,
  validatePromo,
} from '@/features/billing';
import { useAuthStore } from '@/features/auth';
import { cn } from '@/shared/lib';
import { Badge, Button, SubpageShell } from '@/shared/ui';

function openPaymentUrl(url: string): void {
  window.location.assign(url);
}

function formatRub(kopecks: number): string {
  return (kopecks / 100).toLocaleString('ru-RU');
}

function formatPerDay(kopecks: number, days: number): string {
  const perDay = kopecks / 100 / days;
  return perDay.toLocaleString('ru-RU', {
    minimumFractionDigits: perDay < 1 ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

const LICENSE_FEATURES = [
  {
    icon: Camera,
    title: 'AI-анализ фото и описания',
    description: 'Снимаете тарелку — получаете КБЖУ без ручного ввода',
  },
  {
    icon: MessageSquarePlus,
    title: 'Уточнения без лимита',
    description: '«Дополнить» сколько угодно — пока лицензия активна',
  },
  {
    icon: Sparkles,
    title: 'Год спокойствия',
    description: 'Не думаете о квоте: анализируйте каждый приём пищи',
  },
] as const;

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
  const [promoOpen, setPromoOpen] = useState(false);
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
  const durationDays = price?.durationDays;
  const displayKopecks = applied?.finalAmount ?? price?.amountKopecks ?? null;
  const priceRub =
    displayKopecks != null ? Math.round(displayKopecks / 100) : null;
  const perDayLabel =
    displayKopecks != null && durationDays != null && durationDays > 0
      ? formatPerDay(displayKopecks, durationDays)
      : null;

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

  useEffect(() => {
    if (applied) setPromoOpen(true);
  }, [applied]);

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
        <section className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Check className="h-6 w-6" strokeWidth={2.5} />
          </div>
          <h2 className="text-xl font-semibold tracking-tight">Спасибо!</h2>
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
            size="lg"
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
        <section className="space-y-4 rounded-2xl border border-border bg-card px-5 py-6">
          <h2 className="text-xl font-semibold tracking-tight">
            Оплата не прошла
          </h2>
          <p className="text-sm text-muted-foreground">
            Можно попробовать ещё раз. Дневник и ручной ввод по-прежнему
            бесплатны.
          </p>
          <Button
            className="w-full"
            size="lg"
            onClick={() => navigate('/subscribe')}
          >
            Повторить оплату
          </Button>
        </section>
      </SubpageShell>
    );
  }

  const ctaLabel = paying
    ? 'Создаём платёж…'
    : priceRub != null
      ? `Получить доступ · ${priceRub.toLocaleString('ru-RU')} ₽`
      : 'Получить доступ';

  return (
    <SubpageShell
      title="Подписка"
      onBack={() => navigate(-1)}
      mainClassName="space-y-5 pb-28"
      footer={
        <div className="fixed bottom-0 left-1/2 z-20 w-full max-w-md -translate-x-1/2 border-t border-border/80 bg-zinc-50/95 px-4 pt-3 pb-safe backdrop-blur-md">
          <Button
            className="h-12 w-full text-base font-semibold shadow-sm shadow-primary/20"
            size="lg"
            disabled={paying || priceLoading || priceError || priceRub == null}
            onClick={() => void handlePay()}
          >
            {ctaLabel}
          </Button>
          <p className="mt-2 text-center text-[11px] leading-snug text-muted-foreground">
            Разовая оплата · без автосписаний
            {!userToken ? ' · для оплаты нужен вход через Telegram' : ''}
          </p>
        </div>
      }
    >
      <section className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-b from-primary/[0.09] to-card px-5 pb-5 pt-6 shadow-sm">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-primary/10 blur-2xl"
        />
        <div className="relative space-y-4">
          <Badge className="bg-primary/15 text-primary hover:bg-primary/15">
            Годовая лицензия
          </Badge>
          <div className="space-y-2">
            <h2 className="text-[1.65rem] font-semibold leading-tight tracking-tight">
              AI без лимита — весь год
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Фото еды → КБЖУ за секунды. Один платёж, без подписки и
              сюрпризов в конце месяца.
            </p>
          </div>

          <div className="rounded-xl bg-background/80 px-4 py-4 ring-1 ring-border/60">
            {priceLoading && (
              <p className="text-sm text-muted-foreground">Загрузка цены…</p>
            )}
            {priceError && (
              <p className="text-sm text-muted-foreground">Цена недоступна</p>
            )}
            {displayKopecks != null && (
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  {applied && (
                    <p className="mb-0.5 text-sm text-muted-foreground line-through tabular-nums">
                      {formatRub(applied.originalAmount)} ₽
                    </p>
                  )}
                  <p className="text-4xl font-semibold tracking-tight tabular-nums">
                    {formatRub(displayKopecks)} ₽
                    {applied && (
                      <span className="ml-2 align-middle text-sm font-medium text-primary">
                        −{applied.discountPercent}%
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    на {durationDays != null ? `${durationDays} дней` : 'срок'}
                    {perDayLabel != null && (
                      <>
                        {' '}
                        · ≈ {perDayLabel} ₽ в день
                      </>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary">
                  <Wallet className="h-3.5 w-3.5 shrink-0" />
                  Один раз
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold tracking-tight">Что открывается</h3>
        <ul className="space-y-2">
          {LICENSE_FEATURES.map(({ icon: Icon, title, description }) => (
            <li
              key={title}
              className="flex gap-3 rounded-xl border border-border/80 bg-card px-3.5 py-3 shadow-sm"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium leading-snug">{title}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex items-start gap-2.5 rounded-xl border border-border/70 bg-muted/40 px-3.5 py-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Дневник, ручной ввод, штрихкод и статистика остаются бесплатными —
          лицензия нужна только для AI.
        </p>
      </section>

      <section className="space-y-2">
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-lg px-1 py-1 text-left text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => setPromoOpen((v) => !v)}
          aria-expanded={promoOpen}
        >
          <span>{applied ? `Промокод ${applied.code}` : 'Есть промокод?'}</span>
          <ChevronDown
            className={cn(
              'h-4 w-4 transition-transform',
              promoOpen && 'rotate-180',
            )}
          />
        </button>
        {promoOpen && (
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
        )}
      </section>
    </SubpageShell>
  );
}
