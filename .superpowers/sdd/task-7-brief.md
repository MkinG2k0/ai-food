### Task 7: ai-food typed analyze headers + usage events

**Files:**
- Modify: `apps/ai-food/src/features/auth/model/quotaHeaders.ts`
- Create: `apps/ai-food/src/features/auth/model/resolveAnalyzeUsageKind.ts`
- Create: `apps/ai-food/src/features/auth/model/resolveAnalyzeUsageKind.test.ts`
- Create: `apps/ai-food/src/features/auth/api/recordUsageEvent.ts`
- Modify: `apps/ai-food/src/features/analyze-food/api/analyzeFoodApi.ts`
- Modify: `apps/ai-food/src/features/manual-entry/model/useSaveManualMeal.ts`
- Modify: `apps/ai-food/src/features/scan-barcode/model/useSaveBarcodeMeal.ts`
- Modify: `apps/ai-food/src/features/auth/index.ts`

**Interfaces:**
- `UsageKindHeader = Billable | 'other' | 'manual' | 'barcode'` вЂ” for getQuotaHeaders only billable+other; recordUsageEvent separate
- `resolveAnalyzeUsageKind({ hasImage: boolean; hasDescription: boolean }): 'analyze_photo' | 'analyze_text' | 'analyze_photo_text'`
- `recordUsageEvent(kind: 'manual' | 'barcode'): Promise<void>` вЂ” fire-and-forget safe (catch log, don't throw to UX)

- [ ] **Step 1: Failing resolveAnalyzeUsageKind tests**

```ts
expect(resolveAnalyzeUsageKind({ hasImage: true, hasDescription: false })).toBe('analyze_photo');
expect(resolveAnalyzeUsageKind({ hasImage: false, hasDescription: true })).toBe('analyze_text');
expect(resolveAnalyzeUsageKind({ hasImage: true, hasDescription: true })).toBe('analyze_photo_text');
```

- [ ] **Step 2: Implement helper + extend UsageKindHeader**

```ts
export type UsageKindHeader =
  | 'analyze'
  | 'analyze_photo'
  | 'analyze_text'
  | 'analyze_photo_text'
  | 'refine'
  | 'other';
```

Remove stray `console.log(deviceId)` in `quotaHeaders.ts` while touching the file.

- [ ] **Step 3: analyzeFoodApi uses resolved kind**

After `resolveAnalyzeInput`:

```ts
const usageKind = resolveAnalyzeUsageKind({
  hasImage: images.length > 0,
  hasDescription: Boolean(description?.trim()),
});
// ...
extraHeaders: await getQuotaHeaders(usageKind),
```

- [ ] **Step 4: recordUsageEvent**

```ts
export async function recordUsageEvent(
  kind: 'manual' | 'barcode',
): Promise<void> {
  const gatewayUrl = import.meta.env.VITE_AI_GATEWAY_URL as string | undefined;
  if (!gatewayUrl?.trim()) return;
  try {
    const headers = await getQuotaHeaders('other');
    await fetch(`${gatewayUrl.replace(/\/$/, '')}/usage/event`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind }),
    });
  } catch {
    // non-blocking
  }
}
```

Call after successful `addMeal` in `useSaveManualMeal` and `useSaveBarcodeMeal` (void `recordUsageEvent(...)` вЂ” don't block return).

Export from `features/auth/index.ts`.

- [ ] **Step 5: Run ai-food tests for touched units**

Run: `pnpm --filter ai-food exec vitest run src/features/auth/model/resolveAnalyzeUsageKind.test.ts`  
(Use actual package name from `apps/ai-food/package.json` if different.)

- [ ] **Step 6: Commit**

```bash
git add apps/ai-food/src/features/auth apps/ai-food/src/features/analyze-food/api/analyzeFoodApi.ts apps/ai-food/src/features/manual-entry/model/useSaveManualMeal.ts apps/ai-food/src/features/scan-barcode/model/useSaveBarcodeMeal.ts
git commit -m "feat(ai-food): typed usage kinds and manual/barcode events"
```

---

