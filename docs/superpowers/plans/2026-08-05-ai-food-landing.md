# AI Food marketing landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `apps/ai-web` `/` stub with a full Herb Lab marketing landing (CalZen-like sections, original visuals) that CTAs to the web app and RuStore.

**Architecture:** Server Components + CSS in `apps/ai-web`. CTA URLs and copy live in `src/lib/landing/*`. Sections in `src/components/landing/*`. FAQ uses native `<details>` (no client JS). Ant Design stays only via root `AntdRegistry` for admin; landing styles are `.lp-*` and must not break `.legal-doc*` / `.admin-*`.

**Tech Stack:** Next.js 15 App Router, React 18, TypeScript, `next/font` (Fraunces + DM Sans), plain CSS.

**Spec:** `docs/superpowers/specs/2026-08-05-ai-food-landing-design.md`

## Global Constraints

- Language: **Russian** copy only on the landing.
- CTAs: web `https://ai-food-mobile.vercel.app`, RuStore `https://www.rustore.ru/catalog/app/com.aifood.app` — only via `landingConfig`.
- No fake ratings, user counts, testimonials, or ruble prices.
- Quota copy facts: guest **50**, after Telegram login **150** total, yearly license **unlimited**.
- Visual: Herb Lab tokens + full-bleed hero (see spec).
- No Ant Design components on `/`.
- Do not redesign `/terms` `/privacy` `/refunds` or `/admin/*` beyond CSS scoping fixes.
- Verification: `pnpm --filter ai-web type-check` and `pnpm --filter ai-web build` (no ai-web unit tests yet).

## File structure

| Path | Responsibility |
|------|----------------|
| `apps/ai-web/src/lib/landing/config.ts` | URLs, brand, nav anchors, quota numbers |
| `apps/ai-web/src/lib/landing/content.ts` | Section copy: steps, features, compare, pricing, FAQ |
| `apps/ai-web/src/components/landing/CtaButtons.tsx` | Shared web + RuStore link pair |
| `apps/ai-web/src/components/landing/LandingNav.tsx` | Top nav |
| `apps/ai-web/src/components/landing/LandingHero.tsx` | Full-bleed hero |
| `apps/ai-web/src/components/landing/LandingHowItWorks.tsx` | 3 steps |
| `apps/ai-web/src/components/landing/LandingFeatures.tsx` | Features + CSS mock |
| `apps/ai-web/src/components/landing/LandingCompare.tsx` | Vs manual |
| `apps/ai-web/src/components/landing/LandingPricing.tsx` | Free vs license (no ₽) |
| `apps/ai-web/src/components/landing/LandingFaq.tsx` | FAQ `<details>` |
| `apps/ai-web/src/components/landing/LandingFinalCta.tsx` | Closing CTA |
| `apps/ai-web/src/components/landing/LandingFooter.tsx` | Legal + support |
| `apps/ai-web/src/components/landing/index.ts` | Barrel re-exports |
| `apps/ai-web/src/app/page.tsx` | Compose landing |
| `apps/ai-web/src/app/layout.tsx` | Fonts + metadata |
| `apps/ai-web/src/app/globals.css` | `.lp-*` + scope `main` so stub centering does not apply to landing |

---

### Task 1: Landing config + content modules

**Files:**
- Create: `apps/ai-web/src/lib/landing/config.ts`
- Create: `apps/ai-web/src/lib/landing/content.ts`

**Interfaces:**
- Produces:
  - `landingConfig` with `productName`, `webAppUrl`, `ruStoreUrl`, `guestFreeLimit`, `authTotalLimit`, `nav`
  - `landingContent` with `hero`, `howItWorks`, `features`, `compare`, `pricing`, `faq`, `finalCta`

- [ ] **Step 1: Create config**

`apps/ai-web/src/lib/landing/config.ts`:

```ts
export const landingConfig = {
  productName: 'AI Food',
  webAppUrl: 'https://ai-food-mobile.vercel.app',
  ruStoreUrl: 'https://www.rustore.ru/catalog/app/com.aifood.app',
  guestFreeLimit: 50,
  authTotalLimit: 150,
  nav: [
    { href: '#how', label: 'Как работает' },
    { href: '#features', label: 'Возможности' },
    { href: '#pricing', label: 'Тариф' },
    { href: '#faq', label: 'FAQ' },
  ],
} as const;

export type LandingNavItem = (typeof landingConfig.nav)[number];
```

- [ ] **Step 2: Create content**

`apps/ai-web/src/lib/landing/content.ts`:

```ts
import { landingConfig } from './config';

const { guestFreeLimit, authTotalLimit, productName } = landingConfig;

export const landingContent = {
  hero: {
    brand: productName,
    headline: 'Сфотографировал.\nУже знаешь КБЖУ.',
    support:
      'Анализ тарелки за секунды — без весов и поиска в базах. Новый сервис учёта питания с ИИ.',
    primaryCta: 'Открыть в браузере',
    secondaryCta: 'Скачать в RuStore',
  },
  howItWorks: {
    id: 'how',
    eyebrow: 'Как это работает',
    title: 'Без весов. Без баз данных.\nПодсчёт по одному фото.',
    steps: [
      {
        title: 'Сфотографируйте еду',
        body: 'Домашнее блюдо, ресторан или доставка — наведите камеру и сделайте снимок. Искать «куриная грудка 150 г» не нужно.',
      },
      {
        title: 'AI посчитает КБЖУ',
        body: 'Сервис определит продукты на тарелке, оценит порции и отдаст калории, белки, жиры и углеводы.',
      },
      {
        title: 'Ведите дневник без боли',
        body: 'Приём сохраняется в дневник. Дневные цели и прогресс обновляются автоматически — так проще не бросить учёт.',
      },
    ],
  },
  features: {
    id: 'features',
    eyebrow: 'Возможности',
    title: 'Больше, чем фото калорий',
    items: [
      {
        title: 'Анализ по фото',
        body: 'Несколько ракурсов одного блюда, уточнение текстом и правка состава.',
      },
      {
        title: 'Дневник питания',
        body: 'Приёмы, КБЖУ, избранное и быстрое добавление повторяющихся блюд.',
      },
      {
        title: 'Вес и прогресс',
        body: 'Тренд веса и недельные графики — чтобы видеть движение к цели.',
      },
      {
        title: 'Штрихкод и ручной ввод',
        body: 'Упаковка через Open Food Facts или полностью ручная запись без AI.',
      },
      {
        title: 'Аккаунт через Telegram',
        body: 'Войдите, чтобы сохранить бонус генераций и оформить годовую лицензию.',
      },
      {
        title: 'Web и Android',
        body: 'Откройте в браузере как PWA или установите сборку из RuStore.',
      },
    ],
  },
  compare: {
    eyebrow: 'Сравнение',
    title: 'Почему бросают ручной учёт',
    leftTitle: 'Весы и базы',
    leftItems: [
      'Взвешивать каждый грамм',
      'Искать продукты в каталоге',
      'Минуты на один приём',
    ],
    rightTitle: productName,
    rightItems: [
      'Одно фото тарелки',
      'КБЖУ и состав сразу',
      'Секунды — и запись в дневнике',
    ],
  },
  pricing: {
    id: 'pricing',
    eyebrow: 'Тариф',
    title: 'Начните бесплатно. Расширяйте, когда нужно.',
    freeTitle: 'Старт',
    freeBody: `Гостю доступно ${guestFreeLimit} AI-генераций. После входа через Telegram — до ${authTotalLimit} всего. Дневник и базовый учёт работают сразу.`,
    paidTitle: 'Годовая лицензия',
    paidBody:
      'Безлимитные AI-анализы на год. Оплата и актуальная цена — внутри приложения (карта / СБП).',
    ctaNote: 'Откройте приложение, чтобы увидеть цену и оформить лицензию.',
  },
  faq: {
    id: 'faq',
    eyebrow: 'Частые вопросы',
    title: 'Коротко по делу',
    items: [
      {
        q: 'Насколько точен анализ?',
        a: 'Для большинства обычных блюд оценка близка к реальности. Супы, смузи и сложные смеси лучше уточнить текстом или поправить состав вручную.',
      },
      {
        q: 'Как это работает?',
        a: 'Вы фотографируете еду. ИИ распознаёт продукты, оценивает порции и считает калории и БЖУ. Результат можно сохранить в дневник.',
      },
      {
        q: 'Что можно распознать?',
        a: 'Домашнюю еду, ресторанные блюда, снеки и напитки. Для упаковок удобен сканер штрихкода; если AI не подходит — есть ручной ввод.',
      },
      {
        q: 'Это бесплатно?',
        a: `Да, есть бесплатный старт: ${guestFreeLimit} генераций гостю и до ${authTotalLimit} после входа через Telegram. Годовая лицензия даёт безлимит — детали и цена в приложении.`,
      },
      {
        q: 'Где пользоваться: web или RuStore?',
        a: 'Оба варианта. Веб-приложение открывается в браузере; Android-сборку можно взять в RuStore.',
      },
      {
        q: 'Зачем Telegram?',
        a: 'Для входа в аккаунт, бонуса генераций и оплаты лицензии. Дневник на устройстве остаётся вашим локальным журналом.',
      },
      {
        q: 'Как обрабатываются данные?',
        a: 'Фото уходят на анализ через наш gateway к AI-провайдеру. Мы не продаём персональные данные. Подробности — в Политике конфиденциальности.',
      },
      {
        q: 'Чем это отличается от ручного MyFitnessPal-стиля?',
        a: 'Скоростью: вместо поиска и граммовки — фото. Если хотите полный контроль, состав и граммы всё равно можно править.',
      },
    ],
  },
  finalCta: {
    title: 'Попробуйте на своём обеде',
    body: 'Откройте в браузере или установите из RuStore — одно фото, и цифры на экране.',
  },
} as const;
```

- [ ] **Step 3: Type-check**

Run: `pnpm --filter ai-web type-check`  
Expected: PASS (new modules only; no page wire yet is fine)

- [ ] **Step 4: Commit**

```bash
git add apps/ai-web/src/lib/landing/config.ts apps/ai-web/src/lib/landing/content.ts
git commit -m "feat(ai-web): add landing config and Russian copy modules"
```

---

### Task 2: Fonts, metadata, landing CSS foundation

**Files:**
- Modify: `apps/ai-web/src/app/layout.tsx`
- Modify: `apps/ai-web/src/app/globals.css`

**Interfaces:**
- Consumes: none from Task 1 yet
- Produces: CSS variables `--lp-*`, utility classes `.lp-page`, `.lp-section`, `.lp-eyebrow`, `.lp-display`, `.lp-btn`, `.lp-btn--primary`, `.lp-btn--ghost`, `.lp-btn--lime`; body font CSS variables from `next/font`

- [ ] **Step 1: Update root layout with fonts + metadata**

Replace `apps/ai-web/src/app/layout.tsx` with:

```tsx
import type { Metadata } from 'next';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { DM_Sans, Fraunces } from 'next/font/google';

import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-lp-display',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-lp-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AI Food — калории и БЖУ по фото',
  description:
    'AI Food анализирует еду по фото: калории, белки, жиры и углеводы за секунды. Веб и RuStore.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${fraunces.variable} ${dmSans.variable}`}>
      <body>
        <AntdRegistry>{children}</AntdRegistry>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Scope stub `main` and add `.lp-*` foundation**

In `apps/ai-web/src/app/globals.css`:

1. Change the stub centering rule from `main:not(.legal-doc)` to only target the old stub if still needed — **prefer**: remove grid-centering from generic `main`, and let `.legal-doc` / `.lp-page` / `.admin-*` own their layout.

Replace the block:

```css
main:not(.legal-doc) {
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: 24px;
}
```

with nothing (delete it). Keep `body { margin: 0; background: #f5f5f5; }` for admin/legal fallback, but landing will set its own page background via `.lp-page`.

2. **Append** (do not delete `.legal-doc*` / `.admin-*` / `.landing` until page is migrated — after Task 6 you may delete unused `.landing` stub rules) the following landing CSS:

```css
/* —— Marketing landing (Herb Lab) —— */
.lp-page {
  --lp-bg: #f4f8f5;
  --lp-ink: #15261c;
  --lp-sage: #5b8a72;
  --lp-lime: #c5e063;
  --lp-muted: #4a6356;
  --lp-hero-1: #1a2f23;
  --lp-hero-2: #2d4a38;
  --lp-hero-3: #5b8a72;
  --lp-max: 1120px;
  color: var(--lp-ink);
  background: var(--lp-bg);
  font-family: var(--font-lp-sans), system-ui, sans-serif;
  line-height: 1.5;
  min-height: 100vh;
}

.lp-page a {
  color: inherit;
}

.lp-display {
  font-family: var(--font-lp-display), Georgia, serif;
  font-weight: 550;
  letter-spacing: -0.02em;
  line-height: 1.15;
}

.lp-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 12px;
  color: var(--lp-sage);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.lp-eyebrow::before {
  content: '';
  width: 28px;
  height: 4px;
  background: var(--lp-lime);
  border-radius: 2px;
}

.lp-section {
  padding: 72px 24px;
}

.lp-section__inner {
  max-width: var(--lp-max);
  margin: 0 auto;
}

.lp-section h2 {
  margin: 0 0 16px;
  font-size: clamp(28px, 4vw, 40px);
}

.lp-section__lead {
  margin: 0 0 40px;
  max-width: 40rem;
  color: var(--lp-muted);
  font-size: 17px;
}

.lp-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 18px;
  border-radius: 6px;
  border: 1px solid transparent;
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
  transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease;
}

.lp-btn:hover {
  transform: translateY(-1px);
}

.lp-btn--primary {
  background: var(--lp-ink);
  color: var(--lp-bg);
}

.lp-btn--lime {
  background: var(--lp-lime);
  color: var(--lp-ink);
}

.lp-btn--ghost {
  background: transparent;
  border-color: currentColor;
}

.lp-btn--ghost-light {
  background: transparent;
  border-color: rgba(244, 248, 245, 0.55);
  color: #f4f8f5;
}

.lp-cta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

@media (prefers-reduced-motion: reduce) {
  .lp-btn {
    transition: none;
  }
  .lp-btn:hover {
    transform: none;
  }
}
```

(Additional section-specific CSS is added in Tasks 3–5 alongside components.)

- [ ] **Step 3: Type-check**

Run: `pnpm --filter ai-web type-check`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/ai-web/src/app/layout.tsx apps/ai-web/src/app/globals.css
git commit -m "feat(ai-web): add Herb Lab fonts and landing CSS tokens"
```

---

### Task 3: CTA, Nav, Hero

**Files:**
- Create: `apps/ai-web/src/components/landing/CtaButtons.tsx`
- Create: `apps/ai-web/src/components/landing/LandingNav.tsx`
- Create: `apps/ai-web/src/components/landing/LandingHero.tsx`
- Modify: `apps/ai-web/src/app/globals.css` (nav/hero rules)

**Interfaces:**
- Consumes: `landingConfig`, `landingContent.hero`
- Produces: `CtaButtons`, `LandingNav`, `LandingHero`

- [ ] **Step 1: CtaButtons**

`apps/ai-web/src/components/landing/CtaButtons.tsx`:

```tsx
import { landingConfig } from '@/lib/landing/config';
import { landingContent } from '@/lib/landing/content';

type Props = {
  variant?: 'dark' | 'light';
  className?: string;
};

export function CtaButtons({ variant = 'dark', className }: Props) {
  const primaryClass =
    variant === 'light' ? 'lp-btn lp-btn--lime' : 'lp-btn lp-btn--primary';
  const secondaryClass =
    variant === 'light' ? 'lp-btn lp-btn--ghost-light' : 'lp-btn lp-btn--ghost';

  return (
    <div className={`lp-cta-row${className ? ` ${className}` : ''}`}>
      <a
        className={primaryClass}
        href={landingConfig.webAppUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        {landingContent.hero.primaryCta}
      </a>
      <a
        className={secondaryClass}
        href={landingConfig.ruStoreUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        {landingContent.hero.secondaryCta}
      </a>
    </div>
  );
}
```

- [ ] **Step 2: LandingNav**

`apps/ai-web/src/components/landing/LandingNav.tsx`:

```tsx
import { landingConfig } from '@/lib/landing/config';

export function LandingNav() {
  return (
    <header className="lp-nav">
      <div className="lp-nav__inner">
        <a className="lp-nav__brand" href="#top">
          {landingConfig.productName}
        </a>
        <nav className="lp-nav__links" aria-label="Разделы">
          {landingConfig.nav.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
        <a
          className="lp-nav__cta lp-btn lp-btn--lime"
          href={landingConfig.webAppUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Открыть
        </a>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: LandingHero**

`apps/ai-web/src/components/landing/LandingHero.tsx`:

```tsx
import { landingContent } from '@/lib/landing/content';

import { CtaButtons } from './CtaButtons';

export function LandingHero() {
  const { brand, headline, support } = landingContent.hero;
  const [line1, line2] = headline.split('\n');

  return (
    <section className="lp-hero" id="top" aria-labelledby="lp-hero-title">
      <div className="lp-hero__glow" aria-hidden="true" />
      <div className="lp-hero__inner">
        <p className="lp-hero__brand">{brand}</p>
        <h1 id="lp-hero-title" className="lp-display lp-hero__title">
          {line1}
          <br />
          {line2}
        </h1>
        <p className="lp-hero__support">{support}</p>
        <CtaButtons variant="light" />
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Append nav + hero CSS to `globals.css`**

```css
.lp-nav {
  position: sticky;
  top: 0;
  z-index: 20;
  backdrop-filter: blur(10px);
  background: rgba(244, 248, 245, 0.88);
  border-bottom: 1px solid rgba(21, 38, 28, 0.08);
}

.lp-nav__inner {
  max-width: var(--lp-max);
  margin: 0 auto;
  padding: 14px 24px;
  display: flex;
  align-items: center;
  gap: 20px;
}

.lp-nav__brand {
  font-family: var(--font-lp-display), Georgia, serif;
  font-size: 20px;
  font-weight: 600;
  text-decoration: none;
  color: var(--lp-ink);
}

.lp-nav__links {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-left: auto;
  font-size: 14px;
}

.lp-nav__links a {
  text-decoration: none;
  color: var(--lp-muted);
}

.lp-nav__links a:hover {
  color: var(--lp-ink);
}

.lp-nav__cta {
  padding: 8px 14px;
  font-size: 13px;
}

@media (max-width: 720px) {
  .lp-nav__links {
    display: none;
  }
}

.lp-hero {
  position: relative;
  overflow: hidden;
  color: #f4f8f5;
  background: linear-gradient(
    160deg,
    var(--lp-hero-1) 0%,
    var(--lp-hero-2) 45%,
    var(--lp-hero-3) 100%
  );
  min-height: min(92vh, 760px);
  display: flex;
  align-items: flex-end;
  padding: 72px 24px 80px;
}

.lp-hero__glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at 72% 35%,
    rgba(197, 224, 99, 0.28) 0%,
    transparent 55%
  );
  pointer-events: none;
}

.lp-hero__inner {
  position: relative;
  max-width: var(--lp-max);
  margin: 0 auto;
  width: 100%;
}

.lp-hero__brand {
  margin: 0 0 28px;
  font-size: clamp(40px, 8vw, 72px);
  font-family: var(--font-lp-display), Georgia, serif;
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1;
}

.lp-hero__title {
  margin: 0 0 16px;
  font-size: clamp(28px, 5vw, 44px);
  max-width: 16ch;
}

.lp-hero__support {
  margin: 0 0 28px;
  max-width: 36rem;
  font-size: 17px;
  color: rgba(244, 248, 245, 0.82);
}

@keyframes lp-hero-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.lp-hero__inner > * {
  animation: lp-hero-in 0.7s ease both;
}

.lp-hero__inner > *:nth-child(2) {
  animation-delay: 0.08s;
}
.lp-hero__inner > *:nth-child(3) {
  animation-delay: 0.16s;
}
.lp-hero__inner > *:nth-child(4) {
  animation-delay: 0.24s;
}

@media (prefers-reduced-motion: reduce) {
  .lp-hero__inner > * {
    animation: none;
  }
}
```

- [ ] **Step 5: Type-check**

Run: `pnpm --filter ai-web type-check`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/ai-web/src/components/landing/CtaButtons.tsx apps/ai-web/src/components/landing/LandingNav.tsx apps/ai-web/src/components/landing/LandingHero.tsx apps/ai-web/src/app/globals.css
git commit -m "feat(ai-web): add landing nav, hero, and CTA buttons"
```

---

### Task 4: HowItWorks, Features, Compare

**Files:**
- Create: `apps/ai-web/src/components/landing/LandingHowItWorks.tsx`
- Create: `apps/ai-web/src/components/landing/LandingFeatures.tsx`
- Create: `apps/ai-web/src/components/landing/LandingCompare.tsx`
- Modify: `apps/ai-web/src/app/globals.css`

**Interfaces:**
- Consumes: `landingContent.howItWorks | features | compare`
- Produces: three section components

- [ ] **Step 1: LandingHowItWorks**

```tsx
import { landingContent } from '@/lib/landing/content';

export function LandingHowItWorks() {
  const c = landingContent.howItWorks;
  const [t1, t2] = c.title.split('\n');

  return (
    <section className="lp-section" id={c.id}>
      <div className="lp-section__inner">
        <p className="lp-eyebrow">{c.eyebrow}</p>
        <h2 className="lp-display">
          {t1}
          <br />
          {t2}
        </h2>
        <ol className="lp-steps">
          {c.steps.map((step, i) => (
            <li key={step.title} className="lp-steps__item">
              <span className="lp-steps__num" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: LandingFeatures**

```tsx
import { landingContent } from '@/lib/landing/content';

export function LandingFeatures() {
  const c = landingContent.features;

  return (
    <section className="lp-section lp-section--muted" id={c.id}>
      <div className="lp-section__inner lp-features">
        <div className="lp-features__copy">
          <p className="lp-eyebrow">{c.eyebrow}</p>
          <h2 className="lp-display">{c.title}</h2>
          <ul className="lp-feature-grid">
            {c.items.map((item) => (
              <li key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="lp-mock" aria-hidden="true">
          <div className="lp-mock__card">
            <div className="lp-mock__photo" />
            <p className="lp-mock__name">Обед · курица и овощи</p>
            <p className="lp-mock__kcal">520 ккал</p>
            <div className="lp-mock__macros">
              <span>Б 42</span>
              <span>Ж 18</span>
              <span>У 48</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: LandingCompare**

```tsx
import { landingContent } from '@/lib/landing/content';

export function LandingCompare() {
  const c = landingContent.compare;

  return (
    <section className="lp-section">
      <div className="lp-section__inner">
        <p className="lp-eyebrow">{c.eyebrow}</p>
        <h2 className="lp-display">{c.title}</h2>
        <div className="lp-compare">
          <div className="lp-compare__col">
            <h3>{c.leftTitle}</h3>
            <ul>
              {c.leftItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="lp-compare__col lp-compare__col--accent">
            <h3>{c.rightTitle}</h3>
            <ul>
              {c.rightItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Append CSS for steps / features / compare**

```css
.lp-section--muted {
  background: #eaf3ec;
}

.lp-steps {
  list-style: none;
  margin: 40px 0 0;
  padding: 0;
  display: grid;
  gap: 24px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.lp-steps__item h3 {
  margin: 8px 0;
  font-size: 20px;
}

.lp-steps__item p {
  margin: 0;
  color: var(--lp-muted);
  font-size: 15px;
}

.lp-steps__num {
  display: inline-block;
  color: var(--lp-sage);
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.08em;
}

@media (max-width: 800px) {
  .lp-steps {
    grid-template-columns: 1fr;
  }
}

.lp-features {
  display: grid;
  gap: 40px;
  grid-template-columns: 1.2fr 0.8fr;
  align-items: center;
}

.lp-feature-grid {
  list-style: none;
  margin: 32px 0 0;
  padding: 0;
  display: grid;
  gap: 20px;
  grid-template-columns: 1fr 1fr;
}

.lp-feature-grid h3 {
  margin: 0 0 6px;
  font-size: 17px;
}

.lp-feature-grid p {
  margin: 0;
  color: var(--lp-muted);
  font-size: 14px;
}

.lp-mock__card {
  background: #fff;
  border: 1px solid rgba(21, 38, 28, 0.1);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 18px 40px rgba(21, 38, 28, 0.08);
}

.lp-mock__photo {
  height: 140px;
  border-radius: 12px;
  background: linear-gradient(135deg, #d8e8de, #c5e063);
  margin-bottom: 14px;
}

.lp-mock__name {
  margin: 0 0 4px;
  font-size: 14px;
  color: var(--lp-muted);
}

.lp-mock__kcal {
  margin: 0 0 10px;
  font-family: var(--font-lp-display), Georgia, serif;
  font-size: 28px;
}

.lp-mock__macros {
  display: flex;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
}

.lp-mock__macros span {
  background: #eaf3ec;
  padding: 6px 10px;
  border-radius: 999px;
}

@media (max-width: 900px) {
  .lp-features {
    grid-template-columns: 1fr;
  }
  .lp-feature-grid {
    grid-template-columns: 1fr;
  }
}

.lp-compare {
  margin-top: 32px;
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr 1fr;
}

.lp-compare__col {
  padding: 24px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid rgba(21, 38, 28, 0.08);
}

.lp-compare__col--accent {
  background: var(--lp-ink);
  color: #f4f8f5;
  border-color: transparent;
}

.lp-compare__col h3 {
  margin: 0 0 12px;
  font-size: 18px;
}

.lp-compare__col ul {
  margin: 0;
  padding-left: 18px;
  color: inherit;
}

.lp-compare__col--accent ul {
  color: rgba(244, 248, 245, 0.88);
}

@media (max-width: 700px) {
  .lp-compare {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 5: Type-check + commit**

Run: `pnpm --filter ai-web type-check`  
Expected: PASS

```bash
git add apps/ai-web/src/components/landing/LandingHowItWorks.tsx apps/ai-web/src/components/landing/LandingFeatures.tsx apps/ai-web/src/components/landing/LandingCompare.tsx apps/ai-web/src/app/globals.css
git commit -m "feat(ai-web): add how-it-works, features, and compare sections"
```

---

### Task 5: Pricing, FAQ, Final CTA, Footer

**Files:**
- Create: `apps/ai-web/src/components/landing/LandingPricing.tsx`
- Create: `apps/ai-web/src/components/landing/LandingFaq.tsx`
- Create: `apps/ai-web/src/components/landing/LandingFinalCta.tsx`
- Create: `apps/ai-web/src/components/landing/LandingFooter.tsx`
- Modify: `apps/ai-web/src/app/globals.css`

**Interfaces:**
- Consumes: `landingContent`, `landingConfig`, `legalConfig`, `formatSellerBlock`
- Produces: remaining section components

- [ ] **Step 1: LandingPricing**

```tsx
import { landingContent } from '@/lib/landing/content';

import { CtaButtons } from './CtaButtons';

export function LandingPricing() {
  const c = landingContent.pricing;

  return (
    <section className="lp-section lp-section--muted" id={c.id}>
      <div className="lp-section__inner">
        <p className="lp-eyebrow">{c.eyebrow}</p>
        <h2 className="lp-display">{c.title}</h2>
        <div className="lp-pricing">
          <article className="lp-pricing__card">
            <h3>{c.freeTitle}</h3>
            <p>{c.freeBody}</p>
          </article>
          <article className="lp-pricing__card lp-pricing__card--accent">
            <h3>{c.paidTitle}</h3>
            <p>{c.paidBody}</p>
          </article>
        </div>
        <p className="lp-pricing__note">{c.ctaNote}</p>
        <CtaButtons />
      </div>
    </section>
  );
}
```

- [ ] **Step 2: LandingFaq**

```tsx
import { landingContent } from '@/lib/landing/content';

export function LandingFaq() {
  const c = landingContent.faq;

  return (
    <section className="lp-section" id={c.id}>
      <div className="lp-section__inner">
        <p className="lp-eyebrow">{c.eyebrow}</p>
        <h2 className="lp-display">{c.title}</h2>
        <div className="lp-faq">
          {c.items.map((item, i) => (
            <details key={item.q} className="lp-faq__item">
              <summary>
                <span className="lp-faq__idx">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {item.q}
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: LandingFinalCta**

```tsx
import { landingContent } from '@/lib/landing/content';

import { CtaButtons } from './CtaButtons';

export function LandingFinalCta() {
  const c = landingContent.finalCta;

  return (
    <section className="lp-final">
      <div className="lp-final__inner">
        <h2 className="lp-display">{c.title}</h2>
        <p>{c.body}</p>
        <CtaButtons variant="light" />
      </div>
    </section>
  );
}
```

- [ ] **Step 4: LandingFooter**

```tsx
import Link from 'next/link';

import { formatSellerBlock, legalConfig } from '@/lib/legal/legalConfig';
import { landingConfig } from '@/lib/landing/config';

export function LandingFooter() {
  return (
    <footer className="lp-footer">
      <div className="lp-footer__inner">
        <p className="lp-footer__brand">{landingConfig.productName}</p>
        <nav className="lp-footer__nav" aria-label="Документы">
          <Link href="/terms">Условия</Link>
          <Link href="/privacy">Конфиденциальность</Link>
          <Link href="/refunds">Возврат</Link>
          <a
            href={legalConfig.telegramSupport}
            target="_blank"
            rel="noopener noreferrer"
          >
            Поддержка {legalConfig.telegramLabel}
          </a>
        </nav>
        <p className="lp-footer__seller">{formatSellerBlock()}</p>
        <p className="lp-footer__copy">
          © {new Date().getFullYear()} {landingConfig.productName}
        </p>
      </div>
    </footer>
  );
}
```

- [ ] **Step 5: Append pricing / faq / final / footer CSS**

```css
.lp-pricing {
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr 1fr;
  margin: 32px 0 20px;
}

.lp-pricing__card {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  border: 1px solid rgba(21, 38, 28, 0.08);
}

.lp-pricing__card--accent {
  background: var(--lp-ink);
  color: #f4f8f5;
  border-color: transparent;
}

.lp-pricing__card h3 {
  margin: 0 0 10px;
  font-size: 20px;
}

.lp-pricing__card p {
  margin: 0;
  font-size: 15px;
  color: var(--lp-muted);
}

.lp-pricing__card--accent p {
  color: rgba(244, 248, 245, 0.85);
}

.lp-pricing__note {
  margin: 0 0 16px;
  color: var(--lp-muted);
  font-size: 14px;
}

@media (max-width: 700px) {
  .lp-pricing {
    grid-template-columns: 1fr;
  }
}

.lp-faq {
  margin-top: 28px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.lp-faq__item {
  background: #fff;
  border: 1px solid rgba(21, 38, 28, 0.08);
  border-radius: 10px;
  padding: 4px 16px;
}

.lp-faq__item summary {
  cursor: pointer;
  list-style: none;
  display: flex;
  gap: 12px;
  align-items: baseline;
  padding: 14px 0;
  font-weight: 600;
}

.lp-faq__item summary::-webkit-details-marker {
  display: none;
}

.lp-faq__idx {
  color: var(--lp-sage);
  font-size: 13px;
  flex-shrink: 0;
}

.lp-faq__item p {
  margin: 0 0 16px;
  padding-left: 36px;
  color: var(--lp-muted);
  font-size: 15px;
}

.lp-final {
  background: linear-gradient(
    160deg,
    var(--lp-hero-1),
    var(--lp-hero-2) 55%,
    var(--lp-hero-3)
  );
  color: #f4f8f5;
  padding: 80px 24px;
  text-align: center;
}

.lp-final__inner {
  max-width: 640px;
  margin: 0 auto;
}

.lp-final h2 {
  margin: 0 0 12px;
  font-size: clamp(28px, 4vw, 40px);
}

.lp-final p {
  margin: 0 0 24px;
  color: rgba(244, 248, 245, 0.82);
}

.lp-final .lp-cta-row {
  justify-content: center;
}

.lp-footer {
  background: #15261c;
  color: rgba(244, 248, 245, 0.75);
  padding: 40px 24px 56px;
  font-size: 14px;
}

.lp-footer__inner {
  max-width: var(--lp-max);
  margin: 0 auto;
}

.lp-footer__brand {
  margin: 0 0 16px;
  color: #f4f8f5;
  font-family: var(--font-lp-display), Georgia, serif;
  font-size: 22px;
}

.lp-footer__nav {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 20px;
}

.lp-footer__nav a {
  color: #c5e063;
  text-decoration: none;
}

.lp-footer__nav a:hover {
  text-decoration: underline;
}

.lp-footer__seller,
.lp-footer__copy {
  margin: 0 0 8px;
  max-width: 52rem;
}
```

- [ ] **Step 6: Type-check + commit**

Run: `pnpm --filter ai-web type-check`  
Expected: PASS

```bash
git add apps/ai-web/src/components/landing/LandingPricing.tsx apps/ai-web/src/components/landing/LandingFaq.tsx apps/ai-web/src/components/landing/LandingFinalCta.tsx apps/ai-web/src/components/landing/LandingFooter.tsx apps/ai-web/src/app/globals.css
git commit -m "feat(ai-web): add pricing, FAQ, final CTA, and footer"
```

---

### Task 6: Compose page, barrel, cleanup stub, verify

**Files:**
- Create: `apps/ai-web/src/components/landing/index.ts`
- Modify: `apps/ai-web/src/app/page.tsx`
- Modify: `apps/ai-web/src/app/globals.css` (remove obsolete `.landing` stub rules)

**Interfaces:**
- Consumes: all landing components
- Produces: public `/` route

- [ ] **Step 1: Barrel**

`apps/ai-web/src/components/landing/index.ts`:

```ts
export { CtaButtons } from './CtaButtons';
export { LandingNav } from './LandingNav';
export { LandingHero } from './LandingHero';
export { LandingHowItWorks } from './LandingHowItWorks';
export { LandingFeatures } from './LandingFeatures';
export { LandingCompare } from './LandingCompare';
export { LandingPricing } from './LandingPricing';
export { LandingFaq } from './LandingFaq';
export { LandingFinalCta } from './LandingFinalCta';
export { LandingFooter } from './LandingFooter';
```

- [ ] **Step 2: Replace `page.tsx`**

`apps/ai-web/src/app/page.tsx`:

```tsx
import {
  LandingCompare,
  LandingFaq,
  LandingFeatures,
  LandingFinalCta,
  LandingFooter,
  LandingHero,
  LandingHowItWorks,
  LandingNav,
  LandingPricing,
} from '@/components/landing';

export default function HomePage() {
  return (
    <div className="lp-page">
      <LandingNav />
      <main>
        <LandingHero />
        <LandingHowItWorks />
        <LandingFeatures />
        <LandingCompare />
        <LandingPricing />
        <LandingFaq />
        <LandingFinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
```

- [ ] **Step 3: Remove obsolete stub CSS**

Delete from `globals.css`:

```css
.landing {
  text-align: center;
}

.landing h1 {
  margin: 0;
  font-size: 48px;
}

.landing p {
  margin: 8px 0 0;
  color: #8c8c8c;
  font-size: 18px;
}
```

- [ ] **Step 4: Verify**

Run:

```bash
pnpm --filter ai-web type-check
pnpm --filter ai-web build
```

Expected: both PASS; `/` static page built; no «Скоро» in output.

Manual smoke (`pnpm --filter ai-web dev`):

- [ ] Hero shows brand + headline + two CTAs (web + RuStore)
- [ ] Anchors scroll to sections
- [ ] FAQ opens with `<details>`
- [ ] Footer links to `/terms` `/privacy` `/refunds`
- [ ] `/admin/login` still loads
- [ ] No ₽ amounts; no fake ratings/testimonials
- [ ] Mobile width ~375px: nav collapses links, hero readable

- [ ] **Step 5: Commit**

```bash
git add apps/ai-web/src/components/landing/index.ts apps/ai-web/src/app/page.tsx apps/ai-web/src/app/globals.css
git commit -m "feat(ai-web): ship Herb Lab marketing landing on /"
```

---

## Spec coverage self-check

| Spec requirement | Task |
|------------------|------|
| Replace «Скоро» stub | 6 |
| Web + RuStore CTAs | 1, 3, 5 |
| Section map (nav→footer) | 3–6 |
| Early-stage, no fake social proof | 1 content |
| No ₽ prices | 1 pricing copy |
| Quota 50 / 150 / unlimited | 1 |
| Herb Lab + full-bleed hero | 2, 3 |
| FAQ without client JS | 5 `<details>` |
| Footer legal + Telegram | 5 |
| No Ant Design on landing | all tasks |
| type-check + build | each task / Task 6 |

## Placeholder scan

None intentional — all copy, paths, and CSS included.

## Type consistency

- `landingConfig` / `landingContent` shapes stable across tasks
- `CtaButtons` `variant: 'dark' | 'light'` used by Hero, Pricing, FinalCta
- Section `id`s from content match nav `href`s (`#how`, `#features`, `#pricing`, `#faq`)
