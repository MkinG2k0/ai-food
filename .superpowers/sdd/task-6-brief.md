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
