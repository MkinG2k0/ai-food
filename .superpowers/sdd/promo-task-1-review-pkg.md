# Review package Task 1
BASE: 4692d315ef2c71108671c7e50ef2d9655c84d399
HEAD: 8caf7f079a59c4bf33507b53385fdf762628ec7b

## Commits
8caf7f0 feat(billing): add in-code promo catalog helpers


## Stat
 apps/ai-app/src/lib/promos.test.ts | 44 ++++++++++++++++++++++++++++++++
 apps/ai-app/src/lib/promos.ts      | 51 ++++++++++++++++++++++++++++++++++++++
 2 files changed, 95 insertions(+)


## Diff
diff --git a/apps/ai-app/src/lib/promos.test.ts b/apps/ai-app/src/lib/promos.test.ts
new file mode 100644
index 0000000..7895ea1
--- /dev/null
+++ b/apps/ai-app/src/lib/promos.test.ts
@@ -0,0 +1,44 @@
+import { describe, it, expect } from 'vitest';
+import {
+  normalizePromoCode,
+  lookupPromo,
+  applyPromoDiscount,
+  resolvePromo,
+} from './promos.js';
+
+describe('promos', () => {
+  it('normalizePromoCode trims and lowercases', () => {
+    expect(normalizePromoCode(' New80 ')).toBe('new80');
+  });
+
+  it('lookupPromo finds new80 and new50', () => {
+    expect(lookupPromo('new80')).toEqual({ code: 'new80', discountPercent: 80 });
+    expect(lookupPromo('NEW50')).toEqual({ code: 'new50', discountPercent: 50 });
+  });
+
+  it('lookupPromo returns null for unknown', () => {
+    expect(lookupPromo('nope')).toBeNull();
+    expect(lookupPromo('')).toBeNull();
+    expect(lookupPromo('   ')).toBeNull();
+  });
+
+  it('applyPromoDiscount floors and clamps to min 1', () => {
+    expect(applyPromoDiscount(10_000, 80)).toBe(2_000);
+    expect(applyPromoDiscount(10_000, 50)).toBe(5_000);
+    expect(applyPromoDiscount(1, 80)).toBe(1);
+    expect(applyPromoDiscount(3, 80)).toBe(1);
+  });
+
+  it('resolvePromo returns amounts for valid code', () => {
+    expect(resolvePromo(' new80 ', 10_000)).toEqual({
+      code: 'new80',
+      discountPercent: 80,
+      originalAmount: 10_000,
+      finalAmount: 2_000,
+    });
+  });
+
+  it('resolvePromo returns null for invalid', () => {
+    expect(resolvePromo('x', 10_000)).toBeNull();
+  });
+});
diff --git a/apps/ai-app/src/lib/promos.ts b/apps/ai-app/src/lib/promos.ts
new file mode 100644
index 0000000..fabcf98
--- /dev/null
+++ b/apps/ai-app/src/lib/promos.ts
@@ -0,0 +1,51 @@
+export type PromoDefinition = {
+  code: string;
+  discountPercent: number;
+};
+
+export type ResolvedPromo = {
+  code: string;
+  discountPercent: number;
+  originalAmount: number;
+  finalAmount: number;
+};
+
+const PROMOS: Record<string, PromoDefinition> = {
+  new80: { code: 'new80', discountPercent: 80 },
+  new50: { code: 'new50', discountPercent: 50 },
+};
+
+export function normalizePromoCode(raw: string): string {
+  return raw.trim().toLowerCase();
+}
+
+export function lookupPromo(raw: string): PromoDefinition | null {
+  const key = normalizePromoCode(raw);
+  if (!key) return null;
+  return PROMOS[key] ?? null;
+}
+
+/** finalAmount in kopecks; never below 1. */
+export function applyPromoDiscount(
+  originalAmount: number,
+  discountPercent: number,
+): number {
+  const discounted = Math.floor(
+    (originalAmount * (100 - discountPercent)) / 100,
+  );
+  return Math.max(1, discounted);
+}
+
+export function resolvePromo(
+  raw: string,
+  originalAmount: number,
+): ResolvedPromo | null {
+  const promo = lookupPromo(raw);
+  if (!promo) return null;
+  return {
+    code: promo.code,
+    discountPercent: promo.discountPercent,
+    originalAmount,
+    finalAmount: applyPromoDiscount(originalAmount, promo.discountPercent),
+  };
+}

