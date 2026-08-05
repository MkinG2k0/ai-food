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

