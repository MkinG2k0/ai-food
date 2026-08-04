### Task 2: Async subscription price/duration helpers

**Files:**
- Modify: `apps/ai-app/src/lib/subscription.ts`
- Modify: `apps/ai-app/src/lib/subscription.test.ts`

**Interfaces:**
- Consumes: `PrismaClient` (`appSettings.findUnique`)
- Produces:
  - `export type PricingSource = 'db' | 'env'`
  - `export type PricingSnapshot = { priceKopecks: number; durationDays: number; priceSource: PricingSource; durationSource: PricingSource }`
  - `export async function getSubscriptionPriceKopecks(prisma?: PrismaClient | null): Promise<number>`
  - `export async function getSubscriptionDurationDays(prisma?: PrismaClient | null): Promise<number>`
  - `export async function getPricingSnapshot(prisma?: PrismaClient | null): Promise<PricingSnapshot>`
  - `activateYearLicense` must `await getSubscriptionDurationDays(prisma)`

- [ ] **Step 1: Update failing tests**

Replace price/duration tests in `subscription.test.ts` with async versions + DB override cases:

```ts
it('getSubscriptionPriceKopecks defaults to 10000 without prisma', async () => {
  delete process.env.SUBSCRIPTION_PRICE_KOPECKS;
  expect(await getSubscriptionPriceKopecks(null)).toBe(10_000);
  process.env.SUBSCRIPTION_PRICE_KOPECKS = '250000';
  expect(await getSubscriptionPriceKopecks(null)).toBe(250_000);
});

it('getSubscriptionPriceKopecks prefers positive DB value', async () => {
  delete process.env.SUBSCRIPTION_PRICE_KOPECKS;
  const prisma = {
    appSettings: {
      findUnique: vi.fn().mockResolvedValue({
        subscriptionPriceKopecks: 50_000,
        subscriptionDurationDays: null,
      }),
    },
  } as never;
  expect(await getSubscriptionPriceKopecks(prisma)).toBe(50_000);
});

it('getSubscriptionDurationDays defaults to 365 without prisma', async () => {
  delete process.env.SUBSCRIPTION_DURATION_DAYS;
  expect(await getSubscriptionDurationDays(null)).toBe(365);
  process.env.SUBSCRIPTION_DURATION_DAYS = '30';
  expect(await getSubscriptionDurationDays(null)).toBe(30);
});

it('getPricingSnapshot reports db vs env sources', async () => {
  delete process.env.SUBSCRIPTION_PRICE_KOPECKS;
  delete process.env.SUBSCRIPTION_DURATION_DAYS;
  const prisma = {
    appSettings: {
      findUnique: vi.fn().mockResolvedValue({
        subscriptionPriceKopecks: 12_000,
        subscriptionDurationDays: null,
      }),
    },
  } as never;
  const snap = await getPricingSnapshot(prisma);
  expect(snap).toEqual({
    priceKopecks: 12_000,
    durationDays: 365,
    priceSource: 'db',
    durationSource: 'env',
  });
});
```

Update `activateYearLicense` test prisma mock to include `appSettings.findUnique` returning null (so duration comes from env):

```ts
const prisma = {
  user: { update },
  appSettings: { findUnique: vi.fn().mockResolvedValue(null) },
} as never;
```

- [ ] **Step 2: Run tests вЂ” expect FAIL**

Run: `cd apps/ai-app && pnpm exec vitest run src/lib/subscription.test.ts`

Expected: FAIL (sync functions / missing `getPricingSnapshot`)

- [ ] **Step 3: Implement async helpers**

Replace price/duration section in `subscription.ts`:

```ts
import type { PrismaClient, SubscriptionStatus } from '../generated/prisma/client.js';

export type PricingSource = 'db' | 'env';

export type PricingSnapshot = {
  priceKopecks: number;
  durationDays: number;
  priceSource: PricingSource;
  durationSource: PricingSource;
};

function envPriceKopecks(): number {
  const n = Number(process.env.SUBSCRIPTION_PRICE_KOPECKS);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 10_000;
}

function envDurationDays(): number {
  const n = Number(process.env.SUBSCRIPTION_DURATION_DAYS);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 365;
}

async function loadSettings(prisma?: PrismaClient | null) {
  if (!prisma) return null;
  try {
    return await prisma.appSettings.findUnique({ where: { id: 1 } });
  } catch {
    return null;
  }
}

export async function getSubscriptionPriceKopecks(
  prisma?: PrismaClient | null,
): Promise<number> {
  const row = await loadSettings(prisma);
  const db = row?.subscriptionPriceKopecks;
  if (db != null && Number.isFinite(db) && db > 0) return Math.floor(db);
  return envPriceKopecks();
}

export async function getSubscriptionDurationDays(
  prisma?: PrismaClient | null,
): Promise<number> {
  const row = await loadSettings(prisma);
  const db = row?.subscriptionDurationDays;
  if (db != null && Number.isFinite(db) && db > 0) return Math.floor(db);
  return envDurationDays();
}

export async function getPricingSnapshot(
  prisma?: PrismaClient | null,
): Promise<PricingSnapshot> {
  const row = await loadSettings(prisma);
  const dbPrice = row?.subscriptionPriceKopecks;
  const dbDays = row?.subscriptionDurationDays;
  const priceFromDb = dbPrice != null && Number.isFinite(dbPrice) && dbPrice > 0;
  const daysFromDb = dbDays != null && Number.isFinite(dbDays) && dbDays > 0;
  return {
    priceKopecks: priceFromDb ? Math.floor(dbPrice!) : envPriceKopecks(),
    durationDays: daysFromDb ? Math.floor(dbDays!) : envDurationDays(),
    priceSource: priceFromDb ? 'db' : 'env',
    durationSource: daysFromDb ? 'db' : 'env',
  };
}
```

In `activateYearLicense`:

```ts
const days = await getSubscriptionDurationDays(prisma);
```

Keep `hasActiveSubscription` / `subscriptionPublicFields` unchanged.

- [ ] **Step 4: Run tests вЂ” expect PASS**

Run: `cd apps/ai-app && pnpm exec vitest run src/lib/subscription.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/ai-app/src/lib/subscription.ts apps/ai-app/src/lib/subscription.test.ts
git commit -m "feat(ai-app): read subscription price/duration from AppSettings with env fallback"
```

---
