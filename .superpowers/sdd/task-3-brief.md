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

