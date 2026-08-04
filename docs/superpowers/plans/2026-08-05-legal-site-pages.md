# Legal site pages (ai-web) + ai-food deep links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Публичные русские страницы `/terms`, `/privacy`, `/refunds` на `ai-web` (структура как CalZen, данные AI Food / ИП); из Settings в `ai-food` открывать их через `VITE_LEGAL_SITE_URL`; удалить in-app `/legal/*`.

**Architecture:** Контент и layout живут только в Next.js `ai-web`. Клиент собирает URL из env-базы + path и открывает внешний браузер. Middleware admin не трогаем (`/admin/:path*` only).

**Tech Stack:** Next.js 15 App Router, React 18, TypeScript, Vite/React Router (ai-food), Vitest (ai-food helper test).

**Spec:** `docs/superpowers/specs/2026-08-05-legal-site-pages-design.md`

## Global Constraints

- Язык документов: **русский**.
- Структура разделов: как CalZen terms/privacy/refunds, факты сервиса AI Food (T‑Bank, OpenRouter/gateway, Telegram auth, локальный дневник).
- Реквизиты: ИП Муталимов Камал Тагирович, ИНН 057201730918, ОГРНИП 325050000157903, email `kamai122000@mail.ru`, Telegram `@double_cumboy` / `https://t.me/double_cumboy`, productName `AI Food`.
- Пути: `/terms`, `/privacy`, `/refunds` (без `.html`).
- Env клиента: `VITE_LEGAL_SITE_URL` (без trailing slash); нормализовать trim + strip `/`.
- Без in-app fallback legal pages — если env пуст, кнопки **disabled**.
- Legal UI: простой CSS, **не** Ant Design admin chrome.
- Не менять billing API / subscribe flow.
- Не переделывать лендинг `/` («Скоро»).

## File structure

| Path | Responsibility |
|------|----------------|
| `apps/ai-web/src/lib/legal/types.ts` | `LegalSection` |
| `apps/ai-web/src/lib/legal/legalConfig.ts` | Реквизиты + `formatSellerBlock` |
| `apps/ai-web/src/lib/legal/termsContent.ts` | Секции Terms |
| `apps/ai-web/src/lib/legal/privacyContent.ts` | Секции Privacy |
| `apps/ai-web/src/lib/legal/refundsContent.ts` | Секции Refunds |
| `apps/ai-web/src/components/LegalDocumentLayout.tsx` | Общий layout документа |
| `apps/ai-web/src/app/terms/page.tsx` | Route `/terms` |
| `apps/ai-web/src/app/privacy/page.tsx` | Route `/privacy` |
| `apps/ai-web/src/app/refunds/page.tsx` | Route `/refunds` |
| `apps/ai-web/src/app/globals.css` | Стили `.legal-doc*` + scope landing `main` |
| `apps/ai-food/src/shared/lib/legalSiteUrl.ts` | `getLegalUrl` |
| `apps/ai-food/src/shared/lib/legalSiteUrl.test.ts` | Unit tests |
| `apps/ai-food/src/shared/lib/index.ts` | Re-export если уже есть barrel |
| `apps/ai-food/.env.example` | Документировать `VITE_LEGAL_SITE_URL` |
| `apps/ai-food/src/pages/settings/ui/SettingsPage.tsx` | Внешние ссылки + «Возврат» |
| `apps/ai-food/src/app/router.tsx` | Убрать legal routes |
| Delete | `apps/ai-food/src/pages/legal/**`, `apps/ai-food/src/shared/legal/**` |

---

### Task 1: ai-web legal foundation (config, types, layout, CSS)

**Files:**
- Create: `apps/ai-web/src/lib/legal/types.ts`
- Create: `apps/ai-web/src/lib/legal/legalConfig.ts`
- Create: `apps/ai-web/src/components/LegalDocumentLayout.tsx`
- Modify: `apps/ai-web/src/app/globals.css`

**Interfaces:**
- Produces:
  - `export type LegalSection = { title: string; paragraphs: string[] }`
  - `export const legalConfig` (fields as in Global Constraints + `revisionDate: '2026-08-05'`)
  - `export function formatSellerBlock(): string`
  - `export function LegalDocumentLayout(props: { title: string; sections: LegalSection[]; children?: never }): JSX.Element`

- [ ] **Step 1: Create types and config**

`apps/ai-web/src/lib/legal/types.ts`:

```ts
export type LegalSection = {
  title: string;
  paragraphs: string[];
};
```

`apps/ai-web/src/lib/legal/legalConfig.ts`:

```ts
export const legalConfig = {
  revisionDate: '2026-08-05',
  sellerName: 'Муталимов Камал Тагирович',
  inn: '057201730918',
  ogrnip: '325050000157903',
  email: 'kamai122000@mail.ru',
  productName: 'AI Food',
  telegramSupport: 'https://t.me/double_cumboy',
  telegramLabel: '@double_cumboy',
} as const;

export function formatSellerBlock(): string {
  const c = legalConfig;
  return `Индивидуальный предприниматель ${c.sellerName}, ИНН ${c.inn}, ОГРНИП ${c.ogrnip}, email: ${c.email}.`;
}
```

- [ ] **Step 2: Create LegalDocumentLayout**

`apps/ai-web/src/components/LegalDocumentLayout.tsx`:

```tsx
import Link from 'next/link';

import { legalConfig } from '@/lib/legal/legalConfig';
import type { LegalSection } from '@/lib/legal/types';

type Props = {
  title: string;
  sections: LegalSection[];
};

function linkify(text: string): React.ReactNode {
  const { email, telegramSupport, telegramLabel } = legalConfig;
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const emailIdx = remaining.indexOf(email);
    const tgIdx = remaining.indexOf(telegramLabel);
    const candidates = [
      emailIdx >= 0 ? { idx: emailIdx, len: email.length, node: (
        <a key={key++} href={`mailto:${email}`}>{email}</a>
      ) } : null,
      tgIdx >= 0 ? { idx: tgIdx, len: telegramLabel.length, node: (
        <a key={key++} href={telegramSupport} target="_blank" rel="noopener noreferrer">{telegramLabel}</a>
      ) } : null,
    ].filter(Boolean) as { idx: number; len: number; node: React.ReactNode }[];

    if (candidates.length === 0) {
      parts.push(remaining);
      break;
    }
    candidates.sort((a, b) => a.idx - b.idx);
    const hit = candidates[0];
    if (hit.idx > 0) parts.push(remaining.slice(0, hit.idx));
    parts.push(hit.node);
    remaining = remaining.slice(hit.idx + hit.len);
  }
  return parts;
}

export function LegalDocumentLayout({ title, sections }: Props) {
  const revised = new Date(legalConfig.revisionDate + 'T00:00:00').toLocaleDateString(
    'ru-RU',
    { year: 'numeric', month: 'long', day: 'numeric' },
  );

  return (
    <main className="legal-doc">
      <header className="legal-doc__header">
        <Link href="/" className="legal-doc__back">
          ← На главную
        </Link>
        <p className="legal-doc__brand">{legalConfig.productName}</p>
      </header>
      <h1 className="legal-doc__title">{title}</h1>
      <p className="legal-doc__meta">Обновлено: {revised}</p>
      {sections.map((section) => (
        <section key={section.title} className="legal-doc__section">
          <h2>{section.title}</h2>
          {section.paragraphs.map((p) => (
            <p key={p.slice(0, 48)}>{linkify(p)}</p>
          ))}
        </section>
      ))}
      <footer className="legal-doc__footer">
        <nav className="legal-doc__nav">
          <Link href="/terms">Условия использования</Link>
          <Link href="/privacy">Политика конфиденциальности</Link>
          <Link href="/refunds">Политика возврата</Link>
        </nav>
        <p className="legal-doc__copy">
          © {new Date().getFullYear()} {legalConfig.productName}. Все права защищены.
        </p>
        <p className="legal-doc__seller">{formatSellerInline()}</p>
      </footer>
    </main>
  );
}

function formatSellerInline(): string {
  const c = legalConfig;
  return `ИП ${c.sellerName} · ИНН ${c.inn}`;
}
```

Note: import `formatSellerBlock` is unused above — keep footer short via `formatSellerInline` local helper; do not leave unused imports.

- [ ] **Step 3: Update globals.css**

Replace the bare `main { ... }` block so landing centering does not crush legal pages. Keep landing styles; add legal-doc styles:

```css
main:not(.legal-doc) {
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: 24px;
}

.legal-doc {
  max-width: 720px;
  margin: 0 auto;
  padding: 32px 24px 64px;
  color: #1f1f1f;
  line-height: 1.6;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  background: #fff;
  min-height: 100vh;
}

.legal-doc__header {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 24px;
}

.legal-doc__back {
  color: #1677ff;
  text-decoration: none;
  font-size: 14px;
}

.legal-doc__back:hover {
  text-decoration: underline;
}

.legal-doc__brand {
  margin: 0;
  font-weight: 600;
  color: #595959;
}

.legal-doc__title {
  margin: 0 0 8px;
  font-size: 32px;
  line-height: 1.25;
}

.legal-doc__meta {
  margin: 0 0 32px;
  color: #8c8c8c;
  font-size: 14px;
}

.legal-doc__section {
  margin-bottom: 28px;
}

.legal-doc__section h2 {
  margin: 0 0 12px;
  font-size: 20px;
}

.legal-doc__section p {
  margin: 0 0 12px;
}

.legal-doc__footer {
  margin-top: 48px;
  padding-top: 24px;
  border-top: 1px solid #f0f0f0;
}

.legal-doc__nav {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 16px;
}

.legal-doc__nav a {
  color: #1677ff;
  text-decoration: none;
  font-size: 14px;
}

.legal-doc__nav a:hover {
  text-decoration: underline;
}

.legal-doc__copy,
.legal-doc__seller {
  margin: 0 0 8px;
  color: #8c8c8c;
  font-size: 13px;
}

.legal-doc a {
  color: #1677ff;
}
```

- [ ] **Step 4: Type-check**

Run: `pnpm --filter ai-web type-check`  
Expected: PASS (или только ошибки из ещё не созданных pages — на этом шаге layout/config должны компилироваться; если tsc ругается только на отсутствующие pages — ок перейти дальше).

- [ ] **Step 5: Commit**

```bash
git add apps/ai-web/src/lib/legal/types.ts apps/ai-web/src/lib/legal/legalConfig.ts apps/ai-web/src/components/LegalDocumentLayout.tsx apps/ai-web/src/app/globals.css
git commit -m "$(cat <<'EOF'
feat(ai-web): add legal document layout and seller config

EOF
)"
```

---

### Task 2: Terms page + content

**Files:**
- Create: `apps/ai-web/src/lib/legal/termsContent.ts`
- Create: `apps/ai-web/src/app/terms/page.tsx`

**Interfaces:**
- Consumes: `legalConfig`, `formatSellerBlock`, `LegalSection`, `LegalDocumentLayout`
- Produces: `export function buildTermsSections(): LegalSection[]`; route `/terms`

- [ ] **Step 1: Create termsContent.ts**

```ts
import { formatSellerBlock, legalConfig } from './legalConfig';
import type { LegalSection } from './types';

export function buildTermsSections(): LegalSection[] {
  const { productName, email, telegramLabel } = legalConfig;

  return [
    {
      title: '1. Принятие условий',
      paragraphs: [
        `Добро пожаловать в приложение ${productName} (далее — «Приложение»). Настоящие Условия использования («Условия») определяют правила доступа к сервису, предоставляемому исполнителем — ${formatSellerBlock()}`,
        'Получая доступ к Приложению и/или используя его, вы соглашаетесь с этими Условиями — как посетитель (просмотр), так и пользователь (регистрация / оплата лицензии). Если вы не согласны с Условиями, не используйте сервис.',
      ],
    },
    {
      title: '2. Регистрация и аккаунт',
      paragraphs: [
        'Для части функций может потребоваться вход через Telegram. При авторизации обрабатываются идентификатор Telegram, имя, username и связанные данные аккаунта в объёме, необходимом для работы сервиса.',
        'Вы несёте ответственность за сохранность доступа к своему аккаунту Telegram и за действия, совершённые с его использованием в Приложении.',
      ],
    },
    {
      title: '3. Политика конфиденциальности',
      paragraphs: [
        'Использование Приложения также регулируется Политикой конфиденциальности. Ознакомьтесь с ней на странице «Политика конфиденциальности» сайта.',
      ],
    },
    {
      title: '4. Интеллектуальная собственность',
      paragraphs: [
        `Все права на Приложение, сервисы и контент (за исключением контента, загруженного пользователем) принадлежат исполнителю или его лицензиарам. Запрещается копировать, модифицировать, распространять или использовать материалы сервиса вне предоставленной лицензии без согласия исполнителя.`,
      ],
    },
    {
      title: '5. Лицензия и оплата',
      paragraphs: [
        `Платные функции ${productName} предоставляются как цифровая лицензия на безлимитный AI-анализ фото и описания еды, а также AI-уточнение результатов на срок действия лицензии.`,
        'Оплата разовая через платёжный сервис T‑Bank (оплата по ссылке), без автопродления. Актуальная цена и срок лицензии указываются на экране оплаты в Приложении.',
        'Ведение дневника питания, ручной ввод блюд и связанные бесплатные функции могут быть доступны без оплаты лицензии в рамках бесплатного функционала.',
        'Оплата означает полное и безоговорочное принятие настоящей публичной оферты. После подтверждения платежа (статус CONFIRMED) лицензия активируется на указанный срок; статус отображается в Приложении.',
      ],
    },
    {
      title: '6. Изменение условий',
      paragraphs: [
        'Исполнитель вправе изменять Условия. Актуальная версия публикуется на этой странице с обновлённой датой. Продолжение использования сервиса после публикации изменений означает согласие с новой редакцией, если иное не требуется законом.',
      ],
    },
    {
      title: '7. Ограничение и прекращение доступа',
      paragraphs: [
        'Исполнитель вправе ограничить или прекратить доступ к сервису при нарушении Условий, злоупотреблениях, подозрении в мошенничестве или по иным законным основаниям, а также при технических или правовых препятствиях к оказанию услуги.',
        'При полном возврате платежа (статус REFUNDED) лицензия деактивируется автоматически.',
      ],
    },
    {
      title: '8. Отказ от медицинской ответственности',
      paragraphs: [
        `${productName} не является медицинским приложением и не предоставляет медицинские консультации, диагнозы или планы лечения. Учёт калорий, целей и анализ приёмов пищи носят информационный и ознакомительный характер.`,
        'Оценки калорийности, БЖУ и состава блюд приблизительны и не заменяют консультацию врача, диетолога или иного специалиста. Вы самостоятельно принимаете решения о питании и здоровье.',
        'Исполнитель не несёт ответственности за последствия решений, принятых на основе данных Приложения. Использование сервиса — на ваш риск.',
      ],
    },
    {
      title: '9. Контакты',
      paragraphs: [
        `По вопросам Условий: email ${email}, Telegram ${telegramLabel}.`,
        formatSellerBlock(),
      ],
    },
  ];
}
```

- [ ] **Step 2: Create page**

`apps/ai-web/src/app/terms/page.tsx`:

```tsx
import type { Metadata } from 'next';

import { LegalDocumentLayout } from '@/components/LegalDocumentLayout';
import { buildTermsSections } from '@/lib/legal/termsContent';

export const metadata: Metadata = {
  title: 'Условия использования — AI Food',
  description: 'Условия использования приложения AI Food',
};

export default function TermsPage() {
  return (
    <LegalDocumentLayout
      title="Условия использования"
      sections={buildTermsSections()}
    />
  );
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm --filter ai-web type-check`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/ai-web/src/lib/legal/termsContent.ts apps/ai-web/src/app/terms/page.tsx
git commit -m "$(cat <<'EOF'
feat(ai-web): add public /terms page

EOF
)"
```

---

### Task 3: Privacy page + content

**Files:**
- Create: `apps/ai-web/src/lib/legal/privacyContent.ts`
- Create: `apps/ai-web/src/app/privacy/page.tsx`

**Interfaces:**
- Consumes: `legalConfig`, `formatSellerBlock`, `LegalDocumentLayout`
- Produces: `export function buildPrivacySections(): LegalSection[]`; route `/privacy`

- [ ] **Step 1: Create privacyContent.ts**

```ts
import { formatSellerBlock, legalConfig } from './legalConfig';
import type { LegalSection } from './types';

export function buildPrivacySections(): LegalSection[] {
  const { productName, email, telegramLabel } = legalConfig;

  return [
    {
      title: '1. Оператор персональных данных',
      paragraphs: [
        `Оператор, ответственный за обработку персональных данных пользователей ${productName}:`,
        formatSellerBlock(),
        `Обращения: email ${email}, Telegram ${telegramLabel}.`,
      ],
    },
    {
      title: '2. Какие данные мы обрабатываем',
      paragraphs: [
        'Данные, которые вы предоставляете: сведения профиля питания и дневника (цели, вес, записи приёмов пищи и т.п., в объёме, который вы вводите); фото еды и текстовые описания для AI-анализа; обращения в поддержку (email / Telegram и текст сообщения).',
        'Данные аккаунта при входе через Telegram: Telegram ID, имя, фамилия, username, URL фото профиля — в объёме, предоставляемом Telegram.',
        'Технические данные: идентификатор устройства (deviceId) для учёта квот; сведения об устройстве и сессии, необходимые для работы и безопасности сервиса.',
        'Платёжные сведения: сумма, статус, идентификаторы платежа/транзакции. Данные банковской карты (PAN) исполнителю не передаются — оплату обрабатывает T‑Bank.',
        'Данные дневника и профиля питания могут храниться локально на устройстве пользователя.',
      ],
    },
    {
      title: '3. Цели обработки',
      paragraphs: [
        'Предоставление функций Приложения, включая AI-распознавание еды и учёт калорий/БЖУ.',
        'Создание и ведение аккаунта, учёт квот бесплатных AI-генераций.',
        'Приём оплаты и предоставление платной лицензии.',
        'Ответы на обращения в поддержку.',
        'Обеспечение безопасности, стабильности и улучшение сервиса (в обезличенном/агрегированном виде, где это применимо).',
        'Исполнение требований законодательства.',
      ],
    },
    {
      title: '4. Правовые основания',
      paragraphs: [
        'Исполнение договора (акцепт публичной оферты / Условий использования).',
        'Согласие субъекта персональных данных — когда оно требуется законом.',
        'Иные основания, предусмотренные Федеральным законом № 152‑ФЗ «О персональных данных».',
      ],
    },
    {
      title: '5. AI-обработка',
      paragraphs: [
        'При анализе фото еды изображение и сопроводительный текст передаются в AI Gateway и далее провайдерам моделей (в том числе через OpenRouter) исключительно для возврата результата анализа.',
        'Идентифицирующие данные аккаунта (имя, email, Telegram) вместе с фото на анализ намеренно не отправляются — передаются изображение и описание блюда в объёме, нужном для распознавания.',
      ],
    },
    {
      title: '6. Передача третьим лицам',
      paragraphs: [
        'Мы не продаём персональные данные. Передача возможна только сервисам, необходимым для работы продукта:',
        'T‑Bank — приём платежей за лицензию.',
        'OpenRouter и связанные AI-провайдеры — обработка изображений и текстов для анализа питания.',
        'Хостинг и инфраструктура gateway — хранение и передача данных, нужных для работы сервиса.',
        'Telegram — аутентификация пользователя.',
      ],
    },
    {
      title: '7. Трансграничная передача',
      paragraphs: [
        'Данные для AI-анализа могут обрабатываться на инфраструктуре иностранных провайдеров. Используя AI-функции, вы уведомлены о возможности трансграничной передачи настоящей политикой.',
      ],
    },
    {
      title: '8. Сроки хранения и защита',
      paragraphs: [
        'Персональные данные хранятся не дольше, чем нужно для целей обработки и сроков, установленных законом (в т.ч. для платёжных/бухгалтерских записей).',
        'Локальные данные дневника удаляются при удалении данных приложения / uninstall на устройстве пользователя.',
        'Фото для анализа обрабатываются в рамках запроса; оператор не использует их как долговременный публичный архив вне необходимости оказания услуги.',
        'Применяются технические и организационные меры защиты: ограничение доступа, защищённые каналы передачи (TLS/HTTPS) и иные меры по закону.',
      ],
    },
    {
      title: '9. Права субъекта',
      paragraphs: [
        'Вы вправе запросить доступ, уточнение, удаление данных, ограничение обработки, а также отозвать согласие — в случаях, предусмотренных 152‑ФЗ.',
        `Для реализации прав напишите на ${email} или в Telegram ${telegramLabel}. Мы можем запросить подтверждение личности обращения.`,
      ],
    },
    {
      title: '10. Дети',
      paragraphs: [
        `${productName} не предназначен для детей младше 16 лет (или иного возраста, установленного применимым правом). Мы не собираем данные детей намеренно. Если вам стало известно о таких данных — сообщите нам для удаления.`,
      ],
    },
    {
      title: '11. Изменения политики',
      paragraphs: [
        'Мы можем обновлять Политику. Актуальная версия публикуется на этой странице с датой обновления. Существенные изменения могут дополнительно сообщаться в Приложении.',
      ],
    },
    {
      title: '12. Контакты',
      paragraphs: [
        `Email: ${email}. Telegram: ${telegramLabel}.`,
        formatSellerBlock(),
      ],
    },
  ];
}
```

- [ ] **Step 2: Create page**

`apps/ai-web/src/app/privacy/page.tsx`:

```tsx
import type { Metadata } from 'next';

import { LegalDocumentLayout } from '@/components/LegalDocumentLayout';
import { buildPrivacySections } from '@/lib/legal/privacyContent';

export const metadata: Metadata = {
  title: 'Политика конфиденциальности — AI Food',
  description: 'Политика конфиденциальности AI Food',
};

export default function PrivacyPage() {
  return (
    <LegalDocumentLayout
      title="Политика конфиденциальности"
      sections={buildPrivacySections()}
    />
  );
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm --filter ai-web type-check`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/ai-web/src/lib/legal/privacyContent.ts apps/ai-web/src/app/privacy/page.tsx
git commit -m "$(cat <<'EOF'
feat(ai-web): add public /privacy page

EOF
)"
```

---

### Task 4: Refunds page + content

**Files:**
- Create: `apps/ai-web/src/lib/legal/refundsContent.ts`
- Create: `apps/ai-web/src/app/refunds/page.tsx`

**Interfaces:**
- Consumes: `legalConfig`, `formatSellerBlock`, `LegalDocumentLayout`
- Produces: `export function buildRefundsSections(): LegalSection[]`; route `/refunds`

- [ ] **Step 1: Create refundsContent.ts**

```ts
import { formatSellerBlock, legalConfig } from './legalConfig';
import type { LegalSection } from './types';

export function buildRefundsSections(): LegalSection[] {
  const { productName, email, telegramLabel } = legalConfig;

  return [
    {
      title: '1. Цифровая услуга и немедленный доступ',
      paragraphs: [
        `${productName} — цифровой сервис: после оплаты предоставляется доступ к платным функциям (лицензия). С момента успешной оплаты услуга считается предоставленной в части активации доступа.`,
        'Совершая оплату, вы соглашаетесь на немедленное предоставление цифровой услуги.',
      ],
    },
    {
      title: '2. Когда возврат может быть рассмотрен',
      paragraphs: [
        'Запрос направлен в разумный срок после оплаты (ориентир — до 14 дней с момента покупки, если иное не следует из закона о защите прав потребителей применительно к вашей ситуации).',
        'Техническая неисправность препятствует использованию оплаченной услуги, и поддержка не смогла устранить проблему.',
        'Списание произошло ошибочно или является явно несанкционированным.',
        'Возврат не гарантируется автоматически и рассматривается индивидуально.',
      ],
    },
    {
      title: '3. Когда возврат обычно не предоставляется',
      paragraphs: [
        'Вы передумали пользоваться сервисом после активации лицензии.',
        'Вы не использовали сервис в течение оплаченного периода.',
        'Неверное представление о функциональности Приложения до оплаты при отсутствии существенного несоответствия описанию.',
        'Частично или полностью использованный срок лицензии без технических препятствий к использованию.',
      ],
    },
    {
      title: '4. Подписка / лицензия и отмена',
      paragraphs: [
        'Лицензия AI Food оплачивается разово на срок, указанный при покупке, без автопродления через магазины приложений.',
        'Отмена будущих платежей не применяется к модели разовой лицензии; вопросы по текущему периоду решаются через запрос возврата по правилам выше.',
        'При полном возврате (REFUNDED) лицензия деактивируется.',
      ],
    },
    {
      title: '5. Как запросить возврат',
      paragraphs: [
        `Напишите на ${email} или в Telegram ${telegramLabel}. Укажите: email/Telegram, использованные при оплате или в аккаунте; дату оплаты; причину запроса.`,
        'Запрос должен исходить от плательщика / владельца аккаунта.',
      ],
    },
    {
      title: '6. Обработка платежей и возвратов',
      paragraphs: [
        'Платежи обрабатываются T‑Bank. Одобренный возврат выполняется через платёжного провайдера на исходный способ оплаты. Срок зачисления зависит от банка и может составлять несколько рабочих дней.',
      ],
    },
    {
      title: '7. Изменения политики',
      paragraphs: [
        'Мы можем обновлять Политику возврата. Актуальная версия публикуется на этой странице с датой обновления.',
      ],
    },
    {
      title: '8. Контакты',
      paragraphs: [
        formatSellerBlock(),
        `Email: ${email}. Telegram: ${telegramLabel}.`,
      ],
    },
  ];
}
```

- [ ] **Step 2: Create page**

`apps/ai-web/src/app/refunds/page.tsx`:

```tsx
import type { Metadata } from 'next';

import { LegalDocumentLayout } from '@/components/LegalDocumentLayout';
import { buildRefundsSections } from '@/lib/legal/refundsContent';

export const metadata: Metadata = {
  title: 'Политика возврата — AI Food',
  description: 'Политика возврата AI Food',
};

export default function RefundsPage() {
  return (
    <LegalDocumentLayout
      title="Политика возврата"
      sections={buildRefundsSections()}
    />
  );
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm --filter ai-web type-check`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/ai-web/src/lib/legal/refundsContent.ts apps/ai-web/src/app/refunds/page.tsx
git commit -m "$(cat <<'EOF'
feat(ai-web): add public /refunds page

EOF
)"
```

---

### Task 5: ai-food `getLegalUrl` + Settings links + env

**Files:**
- Create: `apps/ai-food/src/shared/lib/legalSiteUrl.ts`
- Create: `apps/ai-food/src/shared/lib/legalSiteUrl.test.ts`
- Modify: `apps/ai-food/src/shared/lib/index.ts` (re-export `getLegalUrl` if file already re-exports helpers)
- Modify: `apps/ai-food/.env.example`
- Modify: `apps/ai-food/src/pages/settings/ui/SettingsPage.tsx`

**Interfaces:**
- Produces:
  - `export type LegalPath = '/terms' | '/privacy' | '/refunds'`
  - `export function getLegalUrl(path: LegalPath, baseUrl?: string): string | null`
  - Behavior: if base empty/whitespace → `null`; else `trim`, strip trailing `/`, return `${base}${path}`

- [ ] **Step 1: Write failing tests**

`apps/ai-food/src/shared/lib/legalSiteUrl.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { getLegalUrl } from './legalSiteUrl';

describe('getLegalUrl', () => {
  it('returns null when base is empty', () => {
    expect(getLegalUrl('/terms', '')).toBeNull();
    expect(getLegalUrl('/terms', '   ')).toBeNull();
  });

  it('joins base and path without duplicate slash', () => {
    expect(getLegalUrl('/terms', 'https://example.com')).toBe(
      'https://example.com/terms',
    );
    expect(getLegalUrl('/privacy', 'https://example.com/')).toBe(
      'https://example.com/privacy',
    );
  });

  it('supports refunds path', () => {
    expect(getLegalUrl('/refunds', 'https://ai.example')).toBe(
      'https://ai.example/refunds',
    );
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `pnpm --filter ai-food test -- src/shared/lib/legalSiteUrl.test.ts`  
Expected: FAIL (module not found / cannot resolve)

- [ ] **Step 3: Implement getLegalUrl**

`apps/ai-food/src/shared/lib/legalSiteUrl.ts`:

```ts
export type LegalPath = '/terms' | '/privacy' | '/refunds';

export function getLegalUrl(
  path: LegalPath,
  baseUrl: string | undefined = import.meta.env.VITE_LEGAL_SITE_URL as
    | string
    | undefined,
): string | null {
  const base = (baseUrl ?? '').trim().replace(/\/+$/, '');
  if (!base) return null;
  return `${base}${path}`;
}
```

If `shared/lib/index.ts` exists and re-exports utilities, add:

```ts
export { getLegalUrl, type LegalPath } from './legalSiteUrl';
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `pnpm --filter ai-food test -- src/shared/lib/legalSiteUrl.test.ts`  
Expected: PASS

- [ ] **Step 5: Update .env.example**

Append:

```bash
# Публичный сайт с legal-страницами (без trailing slash), напр. https://ai-food.example
# VITE_LEGAL_SITE_URL=
```

- [ ] **Step 6: Wire Settings**

In `SettingsPage.tsx`:

1. Import `getLegalUrl` from `@/shared/lib` (or `@/shared/lib/legalSiteUrl`).
2. Replace Условия / Приватность buttons that `navigate('/legal/...')` with:

```tsx
{(() => {
  const termsUrl = getLegalUrl('/terms');
  const privacyUrl = getLegalUrl('/privacy');
  const refundsUrl = getLegalUrl('/refunds');
  return (
    <>
      <Button
        variant="outline"
        className="w-full justify-between"
        disabled={!termsUrl}
        asChild={Boolean(termsUrl)}
      >
        {termsUrl ? (
          <a href={termsUrl} target="_blank" rel="noopener noreferrer">
            Условия
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </a>
        ) : (
          <>
            Условия
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </>
        )}
      </Button>
      <Button
        variant="outline"
        className="w-full justify-between"
        disabled={!privacyUrl}
        asChild={Boolean(privacyUrl)}
      >
        {privacyUrl ? (
          <a href={privacyUrl} target="_blank" rel="noopener noreferrer">
            Приватность
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </a>
        ) : (
          <>
            Приватность
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </>
        )}
      </Button>
      <Button
        variant="outline"
        className="w-full justify-between"
        disabled={!refundsUrl}
        asChild={Boolean(refundsUrl)}
      >
        {refundsUrl ? (
          <a href={refundsUrl} target="_blank" rel="noopener noreferrer">
            Возврат
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </a>
        ) : (
          <>
            Возврат
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </>
        )}
      </Button>
    </>
  );
})()}
```

Prefer extracting three small variables at component top (`termsUrl`, `privacyUrl`, `refundsUrl`) instead of IIFE if Settings already has many hooks — avoid nested IIFE if it hurts readability; same markup is fine inline after hooks.

Remove unused `navigate` for legal only if still needed elsewhere in the file.

- [ ] **Step 7: Type-check ai-food**

Run: `pnpm --filter ai-food type-check`  
Expected: PASS (legal pages still exist until Task 6 — ok)

- [ ] **Step 8: Commit**

```bash
git add apps/ai-food/src/shared/lib/legalSiteUrl.ts apps/ai-food/src/shared/lib/legalSiteUrl.test.ts apps/ai-food/src/shared/lib/index.ts apps/ai-food/.env.example apps/ai-food/src/pages/settings/ui/SettingsPage.tsx
git commit -m "$(cat <<'EOF'
feat(ai-food): open legal docs via VITE_LEGAL_SITE_URL

EOF
)"
```

---

### Task 6: Remove in-app legal routes and modules

**Files:**
- Modify: `apps/ai-food/src/app/router.tsx`
- Delete: `apps/ai-food/src/pages/legal/` (entire tree)
- Delete: `apps/ai-food/src/shared/legal/` (entire tree, including `termsContent.test.ts`)

**Interfaces:**
- Consumes: Settings already uses external URLs (Task 5)
- Produces: no `/legal/*` routes; no `pages/legal` / `shared/legal`

- [ ] **Step 1: Update router**

Remove:

```ts
import { TermsPage, PrivacyPage } from '@/pages/legal';
```

and routes:

```ts
{ path: '/legal/terms', element: <TermsPage /> },
{ path: '/legal/privacy', element: <PrivacyPage /> },
```

- [ ] **Step 2: Delete directories**

Delete all files under:

- `apps/ai-food/src/pages/legal/`
- `apps/ai-food/src/shared/legal/`

- [ ] **Step 3: Grep for leftovers**

Run: search repo under `apps/ai-food/src` for `pages/legal`, `shared/legal`, `/legal/terms`, `/legal/privacy`, `buildTermsSections`, `LegalDocumentPage`  
Expected: no matches in `src/` (docs under `docs/` may still mention old design — leave docs unless trivial).

- [ ] **Step 4: Test + type-check**

Run:

```bash
pnpm --filter ai-food test -- src/shared/lib/legalSiteUrl.test.ts
pnpm --filter ai-food type-check
pnpm --filter ai-web type-check
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add -A apps/ai-food/src/pages/legal apps/ai-food/src/shared/legal apps/ai-food/src/app/router.tsx
git commit -m "$(cat <<'EOF'
refactor(ai-food): remove in-app legal pages in favor of site

EOF
)"
```

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| `/terms`, `/privacy`, `/refunds` on ai-web | 2–4 |
| Russian CalZen-like structure + AI Food data | 2–4 content |
| LegalDocumentLayout + footer links | 1 |
| legalConfig in ai-web | 1 |
| `VITE_LEGAL_SITE_URL` + Settings external links + Возврат | 5 |
| Remove in-app legal | 6 |
| Middleware unchanged / public legal | implicit (no middleware edit) |
| No landing redesign | no task touches page.tsx copy beyond CSS scope |
| Disabled buttons if env empty | Task 5 |

No TBD placeholders. Signatures consistent: `LegalPath`, `getLegalUrl`, `build*Sections`, `LegalDocumentLayout`.
