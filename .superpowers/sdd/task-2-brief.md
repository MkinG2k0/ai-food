### Task 2: Typed billable usage kinds (quota lib + middleware)

**Files:**
- Modify: `apps/ai-app/src/lib/quota.ts`
- Modify: `apps/ai-app/src/lib/quota.test.ts`
- Modify: `apps/ai-app/src/middleware/quota.ts`
- Modify: `apps/ai-app/src/middleware/quota.test.ts` (if asserts on kind)

**Interfaces:**
- Produces:
  - `export type BillableUsageKind = 'analyze' | 'analyze_photo' | 'analyze_text' | 'analyze_photo_text' | 'refine'`
  - `export type UsageKind = BillableUsageKind | 'other'`
  - `export function isBillableUsageKind(kind: string): kind is BillableUsageKind`
  - `parseUsageKind(raw): UsageKind` вЂ” empty в†’ `analyze`; known billable в†’ self; else `other`
  - `countGuestBillableUsage` / `recordBillableUsage` use billable filter / `BillableUsageKind`
- Consumes: Prisma `usageEvent`

- [ ] **Step 1: Failing tests for parseUsageKind + billable filter**

In `quota.test.ts` replace/extend:

```ts
it('parseUsageKind: empty в†’ analyze; typed; unknown в†’ other', () => {
  expect(parseUsageKind(undefined)).toBe('analyze');
  expect(parseUsageKind('')).toBe('analyze');
  expect(parseUsageKind('analyze_photo')).toBe('analyze_photo');
  expect(parseUsageKind('analyze_text')).toBe('analyze_text');
  expect(parseUsageKind('analyze_photo_text')).toBe('analyze_photo_text');
  expect(parseUsageKind('refine')).toBe('refine');
  expect(parseUsageKind('analyze')).toBe('analyze');
  expect(parseUsageKind('manual')).toBe('other');
  expect(parseUsageKind('nope')).toBe('other');
});

it('isBillableUsageKind treats analyze* and refine', () => {
  expect(isBillableUsageKind('analyze_photo')).toBe(true);
  expect(isBillableUsageKind('manual')).toBe(false);
});
```

- [ ] **Step 2: Run tests вЂ” expect FAIL**

Run: `pnpm --filter openrouter-gateway exec vitest run src/lib/quota.test.ts`  
Expected: FAIL (old parseUsageKind / missing exports)

- [ ] **Step 3: Implement quota.ts**

Replace `BILLABLE_KINDS` / `UsageKind` / `parseUsageKind` / count / record:

```ts
export type BillableUsageKind =
  | 'analyze'
  | 'analyze_photo'
  | 'analyze_text'
  | 'analyze_photo_text'
  | 'refine';

export type UsageKind = BillableUsageKind | 'other';

const BILLABLE_SET = new Set<string>([
  'analyze',
  'analyze_photo',
  'analyze_text',
  'analyze_photo_text',
  'refine',
]);

export function isBillableUsageKind(kind: string): kind is BillableUsageKind {
  return BILLABLE_SET.has(kind);
}

export function parseUsageKind(raw: string | undefined): UsageKind {
  const v = raw?.trim();
  if (!v) return 'analyze';
  if (isBillableUsageKind(v)) return v;
  return 'other';
}

export function billableUsageWhere() {
  return {
    OR: [{ kind: 'refine' as const }, { kind: { startsWith: 'analyze' } }],
  };
}

// countGuestBillableUsage:
// where: { deviceId: deviceRowId, ...billableUsageWhere() }

// recordBillableUsage opts.kind: BillableUsageKind
```

- [ ] **Step 4: Update middleware finalizeQuotaUsage**

```ts
if (!isBillableUsageKind(q.usageKind)) return;
await recordBillableUsage(prisma, {
  deviceRowId: q.deviceRowId,
  kind: q.usageKind,
  userId: q.userId ?? null,
});
```

Update `enforceChatQuota`: `kind === 'other'` still skips enforcement (unchanged).

Fix any middleware tests that expected `undefined` в†’ `other`.

- [ ] **Step 5: Run tests вЂ” expect PASS**

Run: `pnpm --filter openrouter-gateway exec vitest run src/lib/quota.test.ts src/middleware/quota.test.ts`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/ai-app/src/lib/quota.ts apps/ai-app/src/lib/quota.test.ts apps/ai-app/src/middleware/quota.ts apps/ai-app/src/middleware/quota.test.ts
git commit -m "feat(ai-app): typed analyze usage kinds for quota"
```

---

