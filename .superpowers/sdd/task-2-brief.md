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

