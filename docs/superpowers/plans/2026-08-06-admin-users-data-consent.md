# Admin Users + Data Consent + Typed Usage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin «Пользователи» (счётчики генераций + карточка), согласие на сбор данных при первом логине в ai-food, typed `UsageEvent.kind`, обновлённая privacy.

**Architecture:** Prisma `User.dataConsent*`; расширить `parseUsageKind` / квоту под `analyze_*`; `POST /auth/consent` + `POST /usage/event`; admin list/detail с `groupBy`; ai-food `/consent` guard + typed headers; legal copy в ai-web.

**Tech Stack:** Express + Prisma 7 + Vitest (`openrouter-gateway`); Next.js 15 + Ant Design + TanStack Query (`ai-web`); Vite + React Router + Zustand (`ai-food`); pnpm.

**Spec:** `docs/superpowers/specs/2026-08-06-admin-users-data-consent-design.md`

## Global Constraints

- `DATA_CONSENT_VERSION = '2026-08-06'` (shared constant on gateway; ai-food mirrors same string).
- Consent only after Telegram/demo login in **ai-food** (route `/consent`); no device-only consent.
- Billable kinds: `kind === 'refine' || kind.startsWith('analyze')` (includes legacy `analyze` and typed).
- Non-billable event kinds: `manual`, `barcode` via `POST /usage/event` only.
- Chat header whitelist: `analyze`, `analyze_photo`, `analyze_text`, `analyze_photo_text`, `refine`. Missing/empty header → `analyze`. Unknown → `other` (no quota).
- No backfill of legacy events; no server sync of diary/КБЖУ.
- UI copy Russian; admin dark Ant Design patterns as Subscriptions/Payments.
- Verify: `pnpm --filter openrouter-gateway test`; `pnpm --filter ai-web type-check`; `pnpm --filter ai-food test` (or package name from `apps/ai-food/package.json`).

## File structure

| Path | Responsibility |
|------|----------------|
| `apps/ai-app/prisma/schema.prisma` | `dataConsentAt`, `dataConsentVersion` on User |
| `apps/ai-app/prisma/migrations/20260806010000_user_data_consent/migration.sql` | SQL migration |
| `apps/ai-app/src/lib/consent.ts` | `DATA_CONSENT_VERSION` |
| `apps/ai-app/src/lib/quota.ts` | Typed kinds, billable count filter, `recordBillableUsage` |
| `apps/ai-app/src/middleware/quota.ts` | finalize with typed kinds |
| `apps/ai-app/src/routes/auth.ts` | consent fields in `publicUser`; `POST /auth/consent` |
| `apps/ai-app/src/routes/usage.ts` | `POST /usage/event` |
| `apps/ai-app/src/routes/admin.ts` | users list counts, `GET /users/:id`, stats analyze prefix |
| `apps/ai-web/src/app/api/admin/gateway/users/[id]/route.ts` | BFF detail proxy |
| `apps/ai-web/src/components/AdminShell.tsx` | Nav «Пользователи» |
| `apps/ai-web/src/app/admin/users/page.tsx` | Users list |
| `apps/ai-web/src/app/admin/users/[id]/page.tsx` | User detail |
| `apps/ai-web/src/lib/legal/privacyContent.ts` | Data collection copy |
| `apps/ai-web/src/lib/legal/legalConfig.ts` | `revisionDate` |
| `apps/ai-food/src/features/auth/model/quotaHeaders.ts` | Extended `UsageKindHeader` |
| `apps/ai-food/src/features/auth/api/submitDataConsent.ts` | POST consent |
| `apps/ai-food/src/features/auth/api/recordUsageEvent.ts` | POST usage event |
| `apps/ai-food/src/features/auth/model/useAuthStore.ts` | consent fields |
| `apps/ai-food/src/features/auth/model/resolveAnalyzeUsageKind.ts` | photo/text mapping |
| `apps/ai-food/src/features/analyze-food/api/analyzeFoodApi.ts` | typed header |
| `apps/ai-food/src/app/ConsentGuard.tsx` | Redirect if no consent |
| `apps/ai-food/src/pages/consent/*` | Consent page UI |
| `apps/ai-food/src/app/router.tsx` | `/consent` + wrap guards |

---

### Task 1: Prisma User consent fields

**Files:**
- Modify: `apps/ai-app/prisma/schema.prisma`
- Create: `apps/ai-app/prisma/migrations/20260806010000_user_data_consent/migration.sql`
- Create: `apps/ai-app/src/lib/consent.ts`
- Test: N/A (schema); generate client

**Interfaces:**
- Produces: `User.dataConsentAt: DateTime | null`, `User.dataConsentVersion: String | null`; `DATA_CONSENT_VERSION = '2026-08-06'`

- [ ] **Step 1: Add fields to schema**

In `model User` after `photoUrl`:

```prisma
  dataConsentAt      DateTime?
  dataConsentVersion String?
```

- [ ] **Step 2: Add migration SQL**

```sql
-- AlterTable
ALTER TABLE "User" ADD COLUMN "dataConsentAt" TIMESTAMP(3),
ADD COLUMN "dataConsentVersion" TEXT;
```

- [ ] **Step 3: Add consent constant**

`apps/ai-app/src/lib/consent.ts`:

```ts
export const DATA_CONSENT_VERSION = '2026-08-06';
```

- [ ] **Step 4: Generate client**

Run: `pnpm --filter openrouter-gateway prisma:generate`  
Expected: success, no schema errors

- [ ] **Step 5: Commit**

```bash
git add apps/ai-app/prisma/schema.prisma apps/ai-app/prisma/migrations/20260806010000_user_data_consent apps/ai-app/src/lib/consent.ts
git commit -m "feat(ai-app): add User data consent fields"
```

---

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
  - `parseUsageKind(raw): UsageKind` — empty → `analyze`; known billable → self; else `other`
  - `countGuestBillableUsage` / `recordBillableUsage` use billable filter / `BillableUsageKind`
- Consumes: Prisma `usageEvent`

- [ ] **Step 1: Failing tests for parseUsageKind + billable filter**

In `quota.test.ts` replace/extend:

```ts
it('parseUsageKind: empty → analyze; typed; unknown → other', () => {
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

- [ ] **Step 2: Run tests — expect FAIL**

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

Fix any middleware tests that expected `undefined` → `other`.

- [ ] **Step 5: Run tests — expect PASS**

Run: `pnpm --filter openrouter-gateway exec vitest run src/lib/quota.test.ts src/middleware/quota.test.ts`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/ai-app/src/lib/quota.ts apps/ai-app/src/lib/quota.test.ts apps/ai-app/src/middleware/quota.ts apps/ai-app/src/middleware/quota.test.ts
git commit -m "feat(ai-app): typed analyze usage kinds for quota"
```

---

### Task 3: Auth consent API + publicUser fields

**Files:**
- Modify: `apps/ai-app/src/routes/auth.ts`
- Modify: `apps/ai-app/src/routes/auth.telegram.test.ts` and/or create `auth.consent.test.ts`
- Modify: `apps/ai-app/src/routes/auth.demo.test.ts` if asserts full user shape

**Interfaces:**
- Consumes: `DATA_CONSENT_VERSION`, JWT via `X-User-Token`
- Produces: `publicUser` includes `dataConsentAt: string | null`, `dataConsentVersion: string | null`
- Produces: `POST /auth/consent` body `{ version: string }` → `publicUser`; 400 wrong version; 401 no/invalid token; idempotent if already set

- [ ] **Step 1: Failing consent tests**

Create `apps/ai-app/src/routes/auth.consent.test.ts` mirroring demo/telegram test harness (mock prisma user with consent null; sign token).

```ts
describe('POST /auth/consent', () => {
  it('401 without token', async () => {
    const res = await request(app).post('/auth/consent').send({ version: '2026-08-06' });
    expect(res.status).toBe(401);
  });

  it('400 on wrong version', async () => { /* with valid token */ });

  it('sets consent and returns fields', async () => {
    // expect dataConsentAt ISO string, dataConsentVersion === '2026-08-06'
  });

  it('idempotent second call keeps original consent', async () => { /* same at */ });
});

describe('GET /auth/me', () => {
  it('includes dataConsentAt null before consent', async () => { /* ... */ });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter openrouter-gateway exec vitest run src/routes/auth.consent.test.ts`  
Expected: FAIL (route missing / fields missing)

- [ ] **Step 3: Extend publicUser + POST /auth/consent**

```ts
import { DATA_CONSENT_VERSION } from '../lib/consent.js';

function publicUser(user: {
  // ...existing
  dataConsentAt: Date | null;
  dataConsentVersion: string | null;
}) {
  return {
    // ...existing fields
    dataConsentAt: user.dataConsentAt?.toISOString() ?? null,
    dataConsentVersion: user.dataConsentVersion,
  };
}

authRouter.post(
  '/consent',
  asyncHandler(async (req, res) => {
    const header = req.header('x-user-token')?.trim();
    if (!header) {
      throw new ApiError(401, 'INVALID_USER_TOKEN', 'X-User-Token required.');
    }
    const payload = await verifyUserToken(header);
    const version = req.body?.version;
    if (version !== DATA_CONSENT_VERSION) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid consent version.');
    }
    const prisma = requireDb();
    const existing = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!existing) {
      throw new ApiError(401, 'INVALID_USER_TOKEN', 'User not found.');
    }
    if (existing.dataConsentAt) {
      res.json(publicUser(existing));
      return;
    }
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        dataConsentAt: new Date(),
        dataConsentVersion: DATA_CONSENT_VERSION,
      },
    });
    res.json(publicUser(updated));
  }),
);
```

Ensure demo upsert / telegram user create still work (new fields optional defaults null).

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm --filter openrouter-gateway exec vitest run src/routes/auth.consent.test.ts src/routes/auth.demo.test.ts src/routes/auth.telegram.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/ai-app/src/routes/auth.ts apps/ai-app/src/routes/auth.consent.test.ts apps/ai-app/src/routes/auth.demo.test.ts apps/ai-app/src/routes/auth.telegram.test.ts
git commit -m "feat(ai-app): POST /auth/consent and consent fields on user"
```

---

### Task 4: `POST /usage/event` for manual/barcode

**Files:**
- Modify: `apps/ai-app/src/routes/usage.ts`
- Create: `apps/ai-app/src/routes/usage.event.test.ts`

**Interfaces:**
- Consumes: `X-Device-Id` required; optional `X-User-Token`; `ensureDevice`
- Produces: `POST /usage/event` body `{ kind: 'manual' | 'barcode' }` → `{ ok: true }`; 400 other kinds; creates UsageEvent (no quota check)

- [ ] **Step 1: Failing tests**

```ts
it('records manual with device', async () => { /* 200, prisma.usageEvent.create called */ });
it('rejects analyze kind', async () => { /* 400 */ });
it('requires device id', async () => { /* 400 */ });
```

- [ ] **Step 2: Run — FAIL**

Run: `pnpm --filter openrouter-gateway exec vitest run src/routes/usage.event.test.ts`

- [ ] **Step 3: Implement route**

```ts
const EventBodySchema = z.object({
  kind: z.enum(['manual', 'barcode']),
});

usageRouter.post(
  '/event',
  asyncHandler(async (req, res) => {
    const deviceId = req.header('x-device-id')?.trim();
    if (!deviceId) {
      throw new ApiError(400, 'DEVICE_ID_REQUIRED', 'X-Device-Id header is required.');
    }
    const parsed = EventBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'kind must be manual or barcode.');
    }
    // require DB same as GET /
    let userId: string | undefined;
    const userToken = req.header('x-user-token')?.trim();
    if (userToken) {
      try {
        const payload = await verifyUserToken(userToken);
        userId = payload.sub;
      } catch {
        /* ignore invalid token for event logging */
      }
    }
    const device = await ensureDevice(prisma, deviceId, userId);
    await prisma.usageEvent.create({
      data: {
        kind: parsed.data.kind,
        deviceId: device.id,
        userId: userId ?? null,
      },
    });
    res.json({ ok: true });
  }),
);
```

Import `z`, `ensureDevice`.

- [ ] **Step 4: Run — PASS**

- [ ] **Step 5: Commit**

```bash
git add apps/ai-app/src/routes/usage.ts apps/ai-app/src/routes/usage.event.test.ts
git commit -m "feat(ai-app): POST /usage/event for manual and barcode"
```

---

### Task 5: Admin users aggregates + detail + stats

**Files:**
- Modify: `apps/ai-app/src/routes/admin.ts`
- Modify: `apps/ai-app/src/routes/admin.test.ts`

**Interfaces:**
- Produces empty counts helper:

```ts
export type UsageCounts = {
  analyze_photo: number;
  analyze_text: number;
  analyze_photo_text: number;
  refine: number;
  manual: number;
  barcode: number;
  analyze: number;
};

function emptyUsageCounts(): UsageCounts {
  return {
    analyze_photo: 0,
    analyze_text: 0,
    analyze_photo_text: 0,
    refine: 0,
    manual: 0,
    barcode: 0,
    analyze: 0,
  };
}
```

- `userResponse` adds `dataConsentAt`, `dataConsentVersion`, `photoUrl?` (optional for list — include if already on model)
- `GET /admin/users` → `{ users: Array<userResponse & { usageCounts: UsageCounts }> }`
- `GET /admin/users/:id` → `{ user, usageCounts, payments, recentEvents }`
- Stats: analyze counts use `kind: { startsWith: 'analyze' }`

**Note:** Register `GET /users/:id` **before** `POST /users/:id/subscription` is fine (different methods); do not shadow subscription route.

- [ ] **Step 1: Failing admin tests**

Extend mock prisma with `usageEvent.groupBy`, `usageEvent.findMany`, consent fields on users.

```ts
it('GET /admin/users includes usageCounts and consent', async () => { /* ... */ });
it('GET /admin/users/:id returns payments and recentEvents', async () => { /* ... */ });
it('GET /admin/users/:id 404', async () => { /* ... */ });
it('GET /admin/stats counts analyze* prefix', async () => { /* mock count where startsWith */ });
```

- [ ] **Step 2: Run — FAIL**

Run: `pnpm --filter openrouter-gateway exec vitest run src/routes/admin.test.ts`

- [ ] **Step 3: Implement**

Update `userResponse`:

```ts
function userResponse(user: {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  photoUrl?: string | null;
  subscriptionStatus: 'none' | 'active' | 'canceled' | 'past_due';
  subscriptionExpiresAt: Date | null;
  dataConsentAt?: Date | null;
  dataConsentVersion?: string | null;
  createdAt?: Date;
}) {
  return {
    id: user.id,
    telegramId: user.telegramId,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    photoUrl: user.photoUrl ?? null,
    dataConsentAt: user.dataConsentAt?.toISOString() ?? null,
    dataConsentVersion: user.dataConsentVersion ?? null,
    createdAt: user.createdAt?.toISOString() ?? undefined,
    ...subscriptionPublicFields(user),
  };
}

async function usageCountsForUserIds(
  prisma: ReturnType<typeof requireDb>,
  userIds: string[],
): Promise<Map<string, UsageCounts>> {
  const map = new Map<string, UsageCounts>();
  for (const id of userIds) map.set(id, emptyUsageCounts());
  if (userIds.length === 0) return map;
  const rows = await prisma.usageEvent.groupBy({
    by: ['userId', 'kind'],
    where: { userId: { in: userIds } },
    _count: { _all: true },
  });
  for (const row of rows) {
    if (!row.userId) continue;
    const counts = map.get(row.userId) ?? emptyUsageCounts();
    if (row.kind in counts) {
      counts[row.kind as keyof UsageCounts] = row._count._all;
    }
    map.set(row.userId, counts);
  }
  return map;
}
```

List handler: after findMany, `usageCountsForUserIds`, map users with counts + include `createdAt`/`photoUrl`/`dataConsent*` in select (findMany returns full model by default).

Detail:

```ts
adminRouter.get(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const prisma = requireDb();
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw new ApiError(404, 'NOT_FOUND', 'User not found.');
    const countsMap = await usageCountsForUserIds(prisma, [user.id]);
    const payments = await prisma.payment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: {
          select: {
            id: true,
            telegramId: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
    const recentEvents = await prisma.usageEvent.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        kind: true,
        deviceId: true,
        createdAt: true,
      },
    });
    // map deviceId (DB row id) — optionally join Device.deviceId client string:
    // prefer include device: { select: { deviceId: true } } and expose clientDeviceId
    res.json({
      user: userResponse(user),
      usageCounts: countsMap.get(user.id) ?? emptyUsageCounts(),
      payments: payments.map(paymentResponse),
      recentEvents: recentEvents.map((e) => ({
        id: e.id,
        kind: e.kind,
        deviceId: e.deviceId,
        createdAt: e.createdAt.toISOString(),
      })),
    });
  }),
);
```

Prefer `include: { device: { select: { deviceId: true } } }` and return `deviceId: e.device.deviceId` (client id) in recentEvents.

Stats analyze counts:

```ts
prisma.usageEvent.count({
  where: { kind: { startsWith: 'analyze' }, createdAt: { gte: last7Days } },
}),
```

- [ ] **Step 4: Run — PASS**

- [ ] **Step 5: Commit**

```bash
git add apps/ai-app/src/routes/admin.ts apps/ai-app/src/routes/admin.test.ts
git commit -m "feat(ai-app): admin users usage counts and detail"
```

---

### Task 6: ai-web admin Users UI + BFF

**Files:**
- Create: `apps/ai-web/src/app/api/admin/gateway/users/[id]/route.ts`
- Modify: `apps/ai-web/src/components/AdminShell.tsx`
- Create: `apps/ai-web/src/app/admin/users/page.tsx`
- Create: `apps/ai-web/src/app/admin/users/[id]/page.tsx`

**Interfaces:**
- Consumes: `adminApi` → `users?q=`, `users/:id`
- Produces: pages at `/admin/users`, `/admin/users/[id]`

- [ ] **Step 1: BFF detail route**

```ts
import { proxyGatewayAdmin } from '@/lib/gatewayAdmin';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return proxyGatewayAdmin(`users/${encodeURIComponent(id)}`);
}
```

(Match existing Next 15 `params` Promise pattern from `payments/[id]/route.ts`.)

- [ ] **Step 2: AdminShell menu**

Add `{ icon: <UserOutlined />, key: '/admin/users', label: 'Пользователи' }` and `pageTitles['/admin/users'] = 'Пользователи'`.  
Import `UserOutlined` from `@ant-design/icons`.  
Ensure `selectedKey` works for `/admin/users/[id]` via `pathname.startsWith('/admin/users')`.

- [ ] **Step 3: List page**

Mirror `subscriptions/page.tsx` search + Table. Types:

```ts
type UsageCounts = {
  analyze_photo: number;
  analyze_text: number;
  analyze_photo_text: number;
  refine: number;
  manual: number;
  barcode: number;
  analyze: number;
};

type AdminUser = {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
  subscriptionStatus: string;
  subscriptionExpiresAt: string | null;
  hasActiveSubscription: boolean;
  dataConsentAt: string | null;
  dataConsentVersion: string | null;
  createdAt?: string;
  usageCounts: UsageCounts;
};
```

Columns: name, @username, telegramId, subscription Tag, consent (Да/Нет + date), counters (Фото / Текст / Ф+Т / Refine / Ручн. / ШК / Legacy), createdAt.  
`onRow: (r) => ({ onClick: () => router.push(`/admin/users/${r.id}`) })`.

PageHeader title «Пользователи», subtitle «Аккаунты, согласие и статистика генераций».

- [ ] **Step 4: Detail page**

`useParams().id` → `adminApi<UserDetailResponse>(\`users/${id}\`)`.  
Sections: profile Card, Statistic grid for counts, Payments Table (reuse formatting from payments page: amount/100, status tags), Events Table (kind, deviceId, createdAt), Button «К списку» → `/admin/users`.

- [ ] **Step 5: Type-check**

Run: `pnpm --filter ai-web type-check`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/ai-web/src/app/api/admin/gateway/users apps/ai-web/src/components/AdminShell.tsx apps/ai-web/src/app/admin/users
git commit -m "feat(ai-web): admin users list and detail pages"
```

---

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
- `UsageKindHeader = Billable | 'other' | 'manual' | 'barcode'` — for getQuotaHeaders only billable+other; recordUsageEvent separate
- `resolveAnalyzeUsageKind({ hasImage: boolean; hasDescription: boolean }): 'analyze_photo' | 'analyze_text' | 'analyze_photo_text'`
- `recordUsageEvent(kind: 'manual' | 'barcode'): Promise<void>` — fire-and-forget safe (catch log, don't throw to UX)

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

Call after successful `addMeal` in `useSaveManualMeal` and `useSaveBarcodeMeal` (void `recordUsageEvent(...)` — don't block return).

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

### Task 8: ai-food consent screen + auth store + guard

**Files:**
- Modify: `apps/ai-food/src/features/auth/model/useAuthStore.ts`
- Create: `apps/ai-food/src/features/auth/api/submitDataConsent.ts`
- Create: `apps/ai-food/src/features/auth/api/fetchAuthMe.ts` (optional if login already returns consent — still useful on app load)
- Create: `apps/ai-food/src/pages/consent/ui/ConsentPage.tsx`
- Create: `apps/ai-food/src/pages/consent/index.ts`
- Create: `apps/ai-food/src/app/ConsentGuard.tsx`
- Create: `apps/ai-food/src/app/ConsentGuard.test.tsx`
- Modify: `apps/ai-food/src/app/router.tsx`
- Modify: `apps/ai-food/src/features/auth/api/signInWithTelegramBot.ts` (+ demo login) to store consent from `user`
- Modify: `apps/ai-food/src/features/auth/index.ts`

**Interfaces:**
- Auth store:

```ts
dataConsentAt: string | null;
setDataConsent: (at: string | null, version: string | null) => void;
// signIn(..., userToken, consent?: { dataConsentAt, dataConsentVersion })
hasDataConsent: () => boolean; // Boolean(dataConsentAt)
```

- Constant in food: `export const DATA_CONSENT_VERSION = '2026-08-06'` in `features/auth/model/dataConsentVersion.ts`

- [ ] **Step 1: Extend store + submitDataConsent**

`submitDataConsent`: POST `${gateway}/auth/consent` with `X-User-Token`, body `{ version: DATA_CONSENT_VERSION }`, update store from response.

On bot/demo login success: `set({ session, userToken, dataConsentAt: user.dataConsentAt ?? null, dataConsentVersion: user.dataConsentVersion ?? null })`.

Persist consent fields in zustand persist (same `ai-food-auth` key).

- [ ] **Step 2: ConsentPage UI**

Full-screen page:
- Title: «Согласие на обработку данных»
- Bullet list: Telegram-аккаунт; deviceId; статистика действий (фото/текст/ручной/штрихкод/уточнения); платежи и подписка; технические логи
- Note: дневник и КБЖУ остаются на устройстве
- Link to privacy via existing `legalSiteUrl('/privacy')` helper
- Checkbox «Согласен на обработку указанных данных»
- Button «Продолжить» disabled until checked; on click → submit → navigate `/` (or `from` state)

- [ ] **Step 3: ConsentGuard**

```tsx
export function ConsentGuard({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.userToken);
  const consentAt = useAuthStore((s) => s.dataConsentAt);
  const location = useLocation();
  if (token && !consentAt) {
    return <Navigate to="/consent" replace state={{ from: location.pathname }} />;
  }
  return children;
}
```

- `/consent` route: if no token → `/login`; if already consent → `/`
- Wrap ProfileGuard children (or AppShell authenticated routes) with ConsentGuard **outside or inside** ProfileGuard: order = Consent first then Profile (consent before onboarding is fine). Spec: after login before diary — wrap the same routes as ProfileGuard + also block settings etc.

```tsx
{ path: '/consent', element: <ConsentPage /> },
{ path: '/', element: <ConsentGuard><ProfileGuard><HomePage /></ProfileGuard></ConsentGuard> },
// same for other protected routes
```

Login page itself stays unwrapped.

- [ ] **Step 4: ConsentGuard tests**

Redirect when token && !consentAt; render children when consent present or logged out.

- [ ] **Step 5: Run tests**

Run: `pnpm --filter ai-food exec vitest run src/app/ConsentGuard.test.tsx`

- [ ] **Step 6: Commit**

```bash
git add apps/ai-food/src/features/auth apps/ai-food/src/pages/consent apps/ai-food/src/app/ConsentGuard.tsx apps/ai-food/src/app/ConsentGuard.test.tsx apps/ai-food/src/app/router.tsx
git commit -m "feat(ai-food): data consent gate after login"
```

---

### Task 9: Legal privacy (and terms touch) updates

**Files:**
- Modify: `apps/ai-web/src/lib/legal/privacyContent.ts`
- Modify: `apps/ai-web/src/lib/legal/legalConfig.ts` (`revisionDate: '2026-08-06'`)
- Modify: `apps/ai-web/src/lib/legal/termsContent.ts` — one sentence that account use requires consent to data processing per Privacy Policy (if not already)

**Interfaces:**
- Section 2 paragraphs must explicitly list:
  - Telegram account fields
  - deviceId
  - Usage events: analyze by photo/text/photo+text, refine, manual, barcode (fact+time; not photo/text payloads in UsageEvent)
  - Payments / subscription
  - Technical API logs
  - Local-only: diary, КБЖУ profile on device
  - First-login consent required; without consent account features unavailable

- [ ] **Step 1: Rewrite section 2 (+ add consent subsection in section 4 if needed)**

Replace vague diary-on-server implications with clear local vs server split per spec.

- [ ] **Step 2: Bump revisionDate**

- [ ] **Step 3: Spot-check pages render** (optional `pnpm --filter ai-web type-check`)

- [ ] **Step 4: Commit**

```bash
git add apps/ai-web/src/lib/legal
git commit -m "docs(ai-web): privacy copy for usage analytics and consent"
```

---

## Spec coverage checklist

| Spec item | Task |
|-----------|------|
| User.dataConsentAt/Version | 1, 3 |
| Typed UsageEvent kinds + quota | 2, 7 |
| POST /auth/consent | 3, 8 |
| POST /usage/event manual/barcode | 4, 7 |
| Admin list + detail | 5, 6 |
| Stats analyze* | 5 |
| Consent UI /consent | 8 |
| Privacy text | 9 |
| Forward-only / no diary sync | Global + 9 |

## Self-review notes

- No TBD placeholders; default missing header = `analyze`, unknown = `other`.
- `GET /admin/users/:id` must not break `POST .../subscription` (method+path distinct).
- ai-food package filter: confirm `name` in `apps/ai-food/package.json` before running pnpm filter commands.
