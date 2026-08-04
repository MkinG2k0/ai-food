# Legal Documents + Subscription Price API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add in-app Условия / Приватность with ИП placeholders, and a public gateway `GET /billing/price` so Subscribe and the offer show the real tariff.

**Architecture:** Gateway exposes price/duration from existing env helpers. Client fetches via `features/billing`. Legal copy lives in `shared/legal` as section builders; pages under `/legal/*` without ProfileGuard; Settings links only under «О приложении».

**Tech Stack:** Express + Vitest/supertest (`ai-app`); React + React Router + TanStack Query + Vitest (`ai-food`).

**Spec:** `apps/ai-food/docs/superpowers/specs/2026-08-04-legal-documents-design.md`

## Global Constraints

- Seller: ИП; реквизиты only as placeholders `[ФИО ИП]`, `[ИНН]`, `[ОГРНИП]`, `[Адрес]`, `[email]`, `[телефон]` — never invent real INN/OGRNIP.
- Legal links only in Settings → «О приложении» (no login/subscribe checkboxes).
- `GET /billing/price` is public (no auth, no DB).
- Price source of truth: `getSubscriptionPriceKopecks()` / `getSubscriptionDurationDays()` (env `SUBSCRIPTION_PRICE_KOPECKS`, `SUBSCRIPTION_DURATION_DAYS`).
- No new npm markdown dependency; render `{ title, paragraphs: string[] }` with JSX.
- Texts are product templates, not legal advice — keep disclaimer in privacy/terms footer short.
- Commit after each task; do not commit unrelated dirty files.

## File structure

| Path | Responsibility |
|------|----------------|
| `apps/ai-app/src/routes/billing.ts` | `GET /price` |
| `apps/ai-app/src/routes/billing.test.ts` | Price route tests |
| `apps/ai-food/src/features/billing/api/billingApi.ts` | `fetchSubscriptionPrice` |
| `apps/ai-food/src/features/billing/api/billingApi.test.ts` | Client price fetch test |
| `apps/ai-food/src/features/billing/model/useSubscriptionPrice.ts` | React Query hook |
| `apps/ai-food/src/features/billing/index.ts` | Re-exports |
| `apps/ai-food/src/pages/subscribe/ui/SubscribePage.tsx` | Use API price |
| `apps/ai-food/src/shared/legal/legalConfig.ts` | Placeholders + revision date |
| `apps/ai-food/src/shared/legal/types.ts` | `LegalSection` type |
| `apps/ai-food/src/shared/legal/termsContent.ts` | `buildTermsSections` |
| `apps/ai-food/src/shared/legal/privacyContent.ts` | `buildPrivacySections` |
| `apps/ai-food/src/shared/legal/termsContent.test.ts` | Price interpolation test |
| `apps/ai-food/src/pages/legal/ui/LegalDocumentPage.tsx` | Shared renderer |
| `apps/ai-food/src/pages/legal/ui/TermsPage.tsx` | Terms + price fetch |
| `apps/ai-food/src/pages/legal/ui/PrivacyPage.tsx` | Privacy |
| `apps/ai-food/src/pages/legal/index.ts` | Exports |
| `apps/ai-food/src/app/router.tsx` | `/legal/terms`, `/legal/privacy` |
| `apps/ai-food/src/pages/settings/ui/SettingsPage.tsx` | Two nav buttons |

---

### Task 1: `GET /billing/price` (ai-app)

**Files:**
- Modify: `apps/ai-app/src/routes/billing.ts`
- Modify: `apps/ai-app/src/routes/billing.test.ts`

**Interfaces:**
- Consumes: `getSubscriptionPriceKopecks()`, `getSubscriptionDurationDays()` from `../lib/subscription.js`
- Produces: `GET /billing/price` → `{ amountKopecks: number, currency: 'RUB', durationDays: number }`

- [ ] **Step 1: Extend subscription mock + write failing tests**

In `billing.test.ts`, add mock for duration next to `mockPrice`:

```ts
const mockDuration = vi.fn();
```

In the `vi.mock('../lib/subscription.js'...)` return object, add:

```ts
getSubscriptionDurationDays: (...args: unknown[]) => mockDuration(...args),
```

In `beforeEach` (or at start of new tests), set defaults:

```ts
mockPrice.mockReturnValue(10_000);
mockDuration.mockReturnValue(365);
```

Append tests:

```ts
  it('GET /billing/price returns amount and duration without auth', async () => {
    mockPrice.mockReturnValue(10_000);
    mockDuration.mockReturnValue(365);
    const res = await request(createApp()).get('/billing/price');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      amountKopecks: 10_000,
      currency: 'RUB',
      durationDays: 365,
    });
  });

  it('GET /billing/price reflects env helpers', async () => {
    mockPrice.mockReturnValue(250_000);
    mockDuration.mockReturnValue(30);
    const res = await request(createApp()).get('/billing/price');
    expect(res.status).toBe(200);
    expect(res.body.amountKopecks).toBe(250_000);
    expect(res.body.durationDays).toBe(30);
  });
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `pnpm --filter openrouter-gateway test -- src/routes/billing.test.ts`

Expected: FAIL (404 NOT_FOUND or missing route for `/billing/price`).

- [ ] **Step 3: Implement route**

Near the top of route handlers in `billing.ts` (before auth-required routes is fine), import `getSubscriptionDurationDays` alongside existing price import, then add:

```ts
billingRouter.get(
  '/price',
  asyncHandler(async (_req, res) => {
    res.json({
      amountKopecks: getSubscriptionPriceKopecks(),
      currency: 'RUB',
      durationDays: getSubscriptionDurationDays(),
    });
  }),
);
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `pnpm --filter openrouter-gateway test -- src/routes/billing.test.ts`

Expected: PASS (including new price tests; existing subscribe tests still pass with `mockPrice`).

- [ ] **Step 5: Commit**

```bash
git add apps/ai-app/src/routes/billing.ts apps/ai-app/src/routes/billing.test.ts
git commit -m "feat(ai-app): expose GET /billing/price for subscription tariff"
```

---

### Task 2: Client `fetchSubscriptionPrice` + hook

**Files:**
- Modify: `apps/ai-food/src/features/billing/api/billingApi.ts`
- Modify: `apps/ai-food/src/features/billing/api/billingApi.test.ts`
- Create: `apps/ai-food/src/features/billing/model/useSubscriptionPrice.ts`
- Modify: `apps/ai-food/src/features/billing/index.ts`

**Interfaces:**
- Consumes: `VITE_AI_GATEWAY_URL`, `gatewayBase()` pattern in `billingApi.ts`
- Produces:
  - `SubscriptionPrice = { amountKopecks: number; currency: string; durationDays: number }`
  - `fetchSubscriptionPrice(): Promise<SubscriptionPrice>`
  - `useSubscriptionPrice()` → `useQuery` (always enabled, no auth)
  - `subscriptionPriceQueryKey = ['billing', 'price'] as const`

- [ ] **Step 1: Write failing client test**

Append to `billingApi.test.ts`:

```ts
  it('fetchSubscriptionPrice GETs /billing/price without user headers', async () => {
    vi.stubEnv('VITE_AI_GATEWAY_URL', 'https://gw.test');
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        amountKopecks: 10_000,
        currency: 'RUB',
        durationDays: 365,
      }),
    });
    const { fetchSubscriptionPrice } = await import('./billingApi');
    const result = await fetchSubscriptionPrice();
    expect(result).toEqual({
      amountKopecks: 10_000,
      currency: 'RUB',
      durationDays: 365,
    });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://gw.test/billing/price',
      expect.objectContaining({ method: 'GET' }),
    );
  });
```

Follow existing test file patterns for `vi.resetModules` / env stubs if present.

- [ ] **Step 2: Run test — expect FAIL**

Run: `pnpm --filter ai-food test -- src/features/billing/api/billingApi.test.ts`

Expected: FAIL (`fetchSubscriptionPrice` not exported).

- [ ] **Step 3: Implement API + hook**

In `billingApi.ts`:

```ts
export type SubscriptionPrice = {
  amountKopecks: number;
  currency: string;
  durationDays: number;
};

export async function fetchSubscriptionPrice(): Promise<SubscriptionPrice> {
  const res = await fetch(`${gatewayBase()}/billing/price`, {
    method: 'GET',
  });
  if (!res.ok) await parseError(res);
  return (await res.json()) as SubscriptionPrice;
}
```

Create `useSubscriptionPrice.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import {
  fetchSubscriptionPrice,
  type SubscriptionPrice,
} from '../api/billingApi';

export const subscriptionPriceQueryKey = ['billing', 'price'] as const;

export function useSubscriptionPrice() {
  return useQuery<SubscriptionPrice, Error>({
    queryKey: subscriptionPriceQueryKey,
    queryFn: fetchSubscriptionPrice,
    staleTime: 5 * 60_000,
  });
}
```

Export from `index.ts`: `fetchSubscriptionPrice`, `SubscriptionPrice`, `useSubscriptionPrice`, `subscriptionPriceQueryKey`.

- [ ] **Step 4: Run tests — expect PASS**

Run: `pnpm --filter ai-food test -- src/features/billing/api/billingApi.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/ai-food/src/features/billing
git commit -m "feat(ai-food): fetch subscription price from gateway"
```

---

### Task 3: SubscribePage uses API price

**Files:**
- Modify: `apps/ai-food/src/pages/subscribe/ui/SubscribePage.tsx`

**Interfaces:**
- Consumes: `useSubscriptionPrice()` from `@/features/billing`
- Produces: UI shows `amountKopecks / 100` ₽ and `durationDays`; loading and error states without hardcoded `PRICE_RUB`

- [ ] **Step 1: Replace hardcoded price**

Remove `const PRICE_RUB = 100`.

Import `useSubscriptionPrice` from `@/features/billing`.

In the main subscribe view (not success/fail):

```tsx
  const { data: price, isLoading: priceLoading, isError: priceError } =
    useSubscriptionPrice();
  const priceRub =
    price != null ? Math.round(price.amountKopecks / 100) : null;
  const durationDays = price?.durationDays;
```

Replace the price block:

```tsx
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
        <p className="text-sm text-muted-foreground">
          Разовая оплата — доступ к AI на{' '}
          {durationDays != null ? `${durationDays} дней` : 'срок лицензии'}.
          Без автосписаний.
        </p>
```

Disable «Оплатить» while `priceLoading` if desired (optional: keep enabled — payment amount is still set server-side).

- [ ] **Step 2: Manual smoke (optional) / typecheck**

Run: `pnpm --filter ai-food exec tsc --noEmit`  
Expected: no errors related to SubscribePage.

- [ ] **Step 3: Commit**

```bash
git add apps/ai-food/src/pages/subscribe/ui/SubscribePage.tsx
git commit -m "feat(ai-food): show subscription price from API on subscribe page"
```

---

### Task 4: Legal content modules

**Files:**
- Create: `apps/ai-food/src/shared/legal/types.ts`
- Create: `apps/ai-food/src/shared/legal/legalConfig.ts`
- Create: `apps/ai-food/src/shared/legal/termsContent.ts`
- Create: `apps/ai-food/src/shared/legal/privacyContent.ts`
- Create: `apps/ai-food/src/shared/legal/termsContent.test.ts`

**Interfaces:**
- Produces:
  - `LegalSection = { title: string; paragraphs: string[] }`
  - `legalConfig` with placeholders + `revisionDate: '2026-08-04'`
  - `formatSellerBlock(): string`
  - `buildTermsSections(opts: { amountKopecks: number | null; durationDays: number | null }): LegalSection[]`
  - `buildPrivacySections(): LegalSection[]`

- [ ] **Step 1: Write failing unit test for price interpolation**

```ts
// apps/ai-food/src/shared/legal/termsContent.test.ts
import { describe, it, expect } from 'vitest';
import { buildTermsSections } from './termsContent';

describe('buildTermsSections', () => {
  it('interpolates rubles and duration when price known', () => {
    const sections = buildTermsSections({
      amountKopecks: 10_000,
      durationDays: 365,
    });
    const priceSection = sections.find((s) => s.title.includes('Цена'));
    expect(priceSection?.paragraphs.join(' ')).toMatch(/100/);
    expect(priceSection?.paragraphs.join(' ')).toMatch(/365/);
  });

  it('uses fallback wording when price null', () => {
    const sections = buildTermsSections({
      amountKopecks: null,
      durationDays: null,
    });
    const priceSection = sections.find((s) => s.title.includes('Цена'));
    expect(priceSection?.paragraphs.join(' ')).toMatch(
      /актуальн(ая|ый) (цена|тариф)|экране оплаты/i,
    );
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `pnpm --filter ai-food test -- src/shared/legal/termsContent.test.ts`

Expected: FAIL (module missing).

- [ ] **Step 3: Implement modules**

`types.ts`:

```ts
export type LegalSection = {
  title: string;
  paragraphs: string[];
};
```

`legalConfig.ts`:

```ts
export const legalConfig = {
  revisionDate: '2026-08-04',
  sellerName: '[ФИО ИП]',
  inn: '[ИНН]',
  ogrnip: '[ОГРНИП]',
  address: '[Адрес]',
  email: '[email]',
  phone: '[телефон]',
  productName: 'AI Food',
  telegramSupport: 'https://t.me/double_cumboy',
} as const;

export function formatSellerBlock(): string {
  const c = legalConfig;
  return `Индивидуальный предприниматель ${c.sellerName}, ИНН ${c.inn}, ОГРНИП ${c.ogrnip}, адрес: ${c.address}, email: ${c.email}, телефон: ${c.phone}.`;
}
```

`termsContent.ts` — implement `buildTermsSections` with these sections (titles exact enough for the test `.includes('Цена')`):

1. **Исполнитель** — `formatSellerBlock()`, status ИП, product `AI Food`.
2. **Предмет договора** — цифровая услуга: лицензия на использование приложения AI Food с безлимитным AI-анализом фото/описания еды и AI-уточнением на срок лицензии; дневник/ручной ввод/штрихкод доступны без оплаты.
3. **Цена и срок** — if `amountKopecks != null && durationDays != null`: `Стоимость лицензии составляет ${Math.round(amountKopecks/100)} ₽ за ${durationDays} дней. Оплата разовая, без автопродления.` Else: `Актуальная цена и срок указаны на экране оплаты в приложении.`
4. **Акцепт оферты** — оплата через платёжный сервис T‑Bank (оплата по ссылке) означает полное принятие условий настоящей оферты.
5. **Предоставление доступа** — после подтверждения платежа (`CONFIRMED`) лицензия активируется на указанный срок; статус доступен в приложении.
6. **Ограничение ответственности** — сервис не является медицинской услугой; оценки КБЖУ и состава носят приблизительный характер и не заменяют консультацию специалиста.
7. **Возврат денежных средств** — при полном возврате платежа (`REFUNDED`) лицензия деактивируется; частичный возврат — по согласованию с исполнителем через контакты ниже.
8. **Претензии** — направлять на `legalConfig.email` / Telegram `legalConfig.telegramSupport`.
9. **Реквизиты** — repeat `formatSellerBlock()`.
10. Optional short disclaimer paragraph in last section: тексты-шаблоны; перед продом заполнить плейсхолдеры.

`privacyContent.ts` — `buildPrivacySections()` sections:

1. **Оператор** — ИП + `formatSellerBlock()`; обращения по ПДн на email/телефон из конфига.
2. **Категории данных** — Telegram ID, имя, фамилия, username, URL фото профиля; идентификатор устройства (deviceId); сведения о платежах (сумма, статус, идентификаторы платежа без данных карты); изображения еды и текстовые описания, передаваемые для AI-анализа на время обработки; данные профиля и дневника, хранимые локально на устройстве пользователя.
3. **Цели обработки** — создание и ведение аккаунта; учёт квот бесплатных генераций; приём оплаты и предоставление лицензии; AI-анализ питания; обеспечение работы и безопасности сервиса.
4. **Правовые основания** — исполнение договора (оферта); согласие субъекта где требуется; иные основания, предусмотренные 152‑ФЗ.
5. **Передача третьим лицам** — T‑Bank (платежи); OpenRouter и иные AI-провайдеры (анализ контента); хостинг/инфраструктура gateway.
6. **Трансграничная передача** — данные для AI-анализа могут передаваться иностранным провайдерам; пользователь уведомлён настоящей политикой.
7. **Сроки и защита** — хранение не дольше, чем требуют цели и закон; технические и организационные меры (ограничение доступа, защищённые каналы) в общем виде.
8. **Права субъекта** — доступ, уточнение, удаление, отзыв согласия — через контакты оператора.
9. **Реквизиты оператора** — `formatSellerBlock()`.

Keep paragraphs as plain strings (no markdown).

- [ ] **Step 4: Run test — expect PASS**

Run: `pnpm --filter ai-food test -- src/shared/legal/termsContent.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/ai-food/src/shared/legal
git commit -m "feat(ai-food): add legal terms and privacy content modules"
```

---

### Task 5: Legal pages + routes + Settings links

**Files:**
- Create: `apps/ai-food/src/pages/legal/ui/LegalDocumentPage.tsx`
- Create: `apps/ai-food/src/pages/legal/ui/TermsPage.tsx`
- Create: `apps/ai-food/src/pages/legal/ui/PrivacyPage.tsx`
- Create: `apps/ai-food/src/pages/legal/index.ts`
- Modify: `apps/ai-food/src/app/router.tsx`
- Modify: `apps/ai-food/src/pages/settings/ui/SettingsPage.tsx`

**Interfaces:**
- Consumes: `buildTermsSections`, `buildPrivacySections`, `legalConfig`, `useSubscriptionPrice`, `SubpageShell`
- Produces: routes `/legal/terms`, `/legal/privacy` (no ProfileGuard); Settings buttons

- [ ] **Step 1: Implement LegalDocumentPage**

```tsx
import { SubpageShell } from '@/shared/ui';
import type { LegalSection } from '@/shared/legal/types';
import { legalConfig } from '@/shared/legal/legalConfig';

type Props = {
  title: string;
  onBack: () => void;
  sections: LegalSection[];
  loadingHint?: string | null;
};

export function LegalDocumentPage({
  title,
  onBack,
  sections,
  loadingHint,
}: Props) {
  return (
    <SubpageShell title={title} onBack={onBack} mainClassName="space-y-6">
      <p className="text-sm text-muted-foreground">
        Редакция от{' '}
        {new Date(legalConfig.revisionDate + 'T00:00:00').toLocaleDateString(
          'ru-RU',
        )}
      </p>
      {loadingHint ? (
        <p className="text-sm text-muted-foreground">{loadingHint}</p>
      ) : null}
      {sections.map((section) => (
        <section key={section.title} className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            {section.title}
          </h2>
          {section.paragraphs.map((p) => (
            <p key={p.slice(0, 48)} className="text-sm text-muted-foreground">
              {p}
            </p>
          ))}
        </section>
      ))}
    </SubpageShell>
  );
}
```

- [ ] **Step 2: TermsPage + PrivacyPage**

`TermsPage.tsx`:

```tsx
import { useNavigate } from 'react-router-dom';
import { useSubscriptionPrice } from '@/features/billing';
import { buildTermsSections } from '@/shared/legal/termsContent';
import { LegalDocumentPage } from './LegalDocumentPage';

export function TermsPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useSubscriptionPrice();
  const sections = buildTermsSections({
    amountKopecks: isError ? null : (data?.amountKopecks ?? null),
    durationDays: isError ? null : (data?.durationDays ?? null),
  });
  return (
    <LegalDocumentPage
      title="Условия"
      onBack={() => navigate('/settings')}
      sections={sections}
      loadingHint={
        isLoading ? 'Загружаем актуальный тариф…' : null
      }
    />
  );
}
```

While loading, still call `buildTermsSections` with nulls so fallback text shows, plus loadingHint — acceptable per spec.

`PrivacyPage.tsx`: same shell with `buildPrivacySections()`, title «Приватность».

`index.ts`: export `TermsPage`, `PrivacyPage`.

- [ ] **Step 3: Router**

Import Terms/Privacy. Add **without** ProfileGuard (same level as `/login`):

```tsx
{ path: '/legal/terms', element: <TermsPage /> },
{ path: '/legal/privacy', element: <PrivacyPage /> },
```

- [ ] **Step 4: Settings links**

In «О приложении», after «Новости» (before or after Telegram), add:

```tsx
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => navigate('/legal/terms')}
          >
            Условия
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Button>
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => navigate('/legal/privacy')}
          >
            Приватность
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Button>
```

- [ ] **Step 5: Verify**

Run: `pnpm --filter ai-food test -- src/shared/legal/termsContent.test.ts src/features/billing/api/billingApi.test.ts`  
Run: `pnpm --filter ai-food exec tsc --noEmit`  
Expected: PASS / no errors.

Smoke: open Settings → Условия / Приватность → Back returns to settings.

- [ ] **Step 6: Commit**

```bash
git add apps/ai-food/src/pages/legal apps/ai-food/src/app/router.tsx apps/ai-food/src/pages/settings/ui/SettingsPage.tsx
git commit -m "feat(ai-food): add terms and privacy pages in settings"
```

---

## Spec coverage checklist

| Spec item | Task |
|-----------|------|
| `GET /billing/price` | 1 |
| Client fetch + Subscribe UI | 2, 3 |
| Terms/Privacy content + placeholders | 4 |
| Routes without ProfileGuard | 5 |
| Settings «О приложении» links only | 5 |
| Price in offer from API / fallback | 4, 5 |
| No consent checkboxes / subscribe links | — non-goal, not implemented |

## Self-review notes

- Types aligned: `SubscriptionPrice.amountKopecks` / `durationDays` match gateway JSON.
- No invented INN; placeholders only in `legalConfig`.
- Billing mock extended with `getSubscriptionDurationDays` so price tests do not depend on real env.
