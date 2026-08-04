### Task 1: Promo catalog helpers

**Files:**
- Create: `apps/ai-app/src/lib/promos.ts`
- Create: `apps/ai-app/src/lib/promos.test.ts`

**Interfaces:**
- Consumes: none (pure helpers; price comes from caller)
- Produces:
  - `export type PromoDefinition = { code: string; discountPercent: number }`
  - `export type ResolvedPromo = { code: string; discountPercent: number; originalAmount: number; finalAmount: number }`
  - `export function normalizePromoCode(raw: string): string`
  - `export function lookupPromo(raw: string): PromoDefinition | null`
  - `export function applyPromoDiscount(originalAmount: number, discountPercent: number): number`
  - `export function resolvePromo(raw: string, originalAmount: number): ResolvedPromo | null`

- [ ] **Step 1: Write the failing tests**

Create `apps/ai-app/src/lib/promos.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  normalizePromoCode,
  lookupPromo,
  applyPromoDiscount,
  resolvePromo,
} from './promos.js';

describe('promos', () => {
  it('normalizePromoCode trims and lowercases', () => {
    expect(normalizePromoCode(' New80 ')).toBe('new80');
  });

  it('lookupPromo finds new80 and new50', () => {
    expect(lookupPromo('new80')).toEqual({ code: 'new80', discountPercent: 80 });
    expect(lookupPromo('NEW50')).toEqual({ code: 'new50', discountPercent: 50 });
  });

  it('lookupPromo returns null for unknown', () => {
    expect(lookupPromo('nope')).toBeNull();
    expect(lookupPromo('')).toBeNull();
    expect(lookupPromo('   ')).toBeNull();
  });

  it('applyPromoDiscount floors and clamps to min 1', () => {
    expect(applyPromoDiscount(10_000, 80)).toBe(2_000);
    expect(applyPromoDiscount(10_000, 50)).toBe(5_000);
    expect(applyPromoDiscount(1, 80)).toBe(1);
    expect(applyPromoDiscount(3, 80)).toBe(1);
  });

  it('resolvePromo returns amounts for valid code', () => {
    expect(resolvePromo(' new80 ', 10_000)).toEqual({
      code: 'new80',
      discountPercent: 80,
      originalAmount: 10_000,
      finalAmount: 2_000,
    });
  });

  it('resolvePromo returns null for invalid', () => {
    expect(resolvePromo('x', 10_000)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test вЂ” expect FAIL**

Run: `cd apps/ai-app && pnpm exec vitest run src/lib/promos.test.ts`

Expected: FAIL (module `./promos.js` not found)

- [ ] **Step 3: Implement `promos.ts`**

Create `apps/ai-app/src/lib/promos.ts`:

```ts
export type PromoDefinition = {
  code: string;
  discountPercent: number;
};

export type ResolvedPromo = {
  code: string;
  discountPercent: number;
  originalAmount: number;
  finalAmount: number;
};

const PROMOS: Record<string, PromoDefinition> = {
  new80: { code: 'new80', discountPercent: 80 },
  new50: { code: 'new50', discountPercent: 50 },
};

export function normalizePromoCode(raw: string): string {
  return raw.trim().toLowerCase();
}

export function lookupPromo(raw: string): PromoDefinition | null {
  const key = normalizePromoCode(raw);
  if (!key) return null;
  return PROMOS[key] ?? null;
}

/** finalAmount in kopecks; never below 1. */
export function applyPromoDiscount(
  originalAmount: number,
  discountPercent: number,
): number {
  const discounted = Math.floor(
    (originalAmount * (100 - discountPercent)) / 100,
  );
  return Math.max(1, discounted);
}

export function resolvePromo(
  raw: string,
  originalAmount: number,
): ResolvedPromo | null {
  const promo = lookupPromo(raw);
  if (!promo) return null;
  return {
    code: promo.code,
    discountPercent: promo.discountPercent,
    originalAmount,
    finalAmount: applyPromoDiscount(originalAmount, promo.discountPercent),
  };
}
```

- [ ] **Step 4: Run tests вЂ” expect PASS**

Run: `cd apps/ai-app && pnpm exec vitest run src/lib/promos.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/ai-app/src/lib/promos.ts apps/ai-app/src/lib/promos.test.ts
git commit -m "$(cat <<'EOF'
feat(billing): add in-code promo catalog helpers

EOF
)"
```

---
