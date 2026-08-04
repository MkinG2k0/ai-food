### Task 5: Admin pricing + stats + users/subscription routes

**Files:**
- Create: `apps/ai-app/src/routes/admin.ts`
- Create: `apps/ai-app/src/routes/admin.test.ts`
- Modify: `apps/ai-app/src/app.ts`
- Modify: `apps/ai-app/.env.example`
- Modify: `turbo.json` (add `ADMIN_API_KEY` to `dev`/`test` `passThroughEnv`)

**Interfaces:**
- Produces router mounted at `/admin` with:
  - `GET /stats`
  - `GET /pricing` в†’ `{ priceKopecks, durationDays, source }` where `source` is `'db'` if **either** field from DB else `'env'` (if mixed, prefer documenting both via snapshot: use `priceSource`/`durationSource` OR single `source: priceSource === 'db' || durationSource === 'db' ? 'db' : 'env'` per spec вЂ” implement **single** `source` as in spec: `'db'` if price **or** duration comes from DB, else `'env'`)
  - `PUT /pricing` body `{ priceKopecks?: number, durationDays?: number }`
  - `GET /users?q=`
  - `POST /users/:id/subscription` body `{ action: 'activate'|'extend'|'revoke', days?: number }`

- [ ] **Step 1: Write route tests (supertest + mocked prisma)**

Follow patterns from `billing.test.ts`: mock `../lib/prisma.js` `getPrisma` / `isDatabaseConfigured`, set `process.env.ADMIN_API_KEY = 'test-admin'`, use `createApp()` from `../app.js`.

Cover at minimum:
1. `GET /admin/pricing` without key в†’ 401
2. `GET /admin/pricing` with key в†’ 200 + fields
3. `PUT /admin/pricing` upserts and returns db source
4. `GET /admin/stats` shape
5. `GET /admin/users?q=alice` search
6. `POST .../subscription` activate / extend / revoke
7. unknown user в†’ 404

- [ ] **Step 2: Run вЂ” expect FAIL** (routes not mounted)

- [ ] **Step 3: Implement `admin.ts`**

Sketch (full implementation must match tests):

```ts
import { Router } from 'express';
import { ApiError } from '../../lib/errors.js';
import { asyncHandler } from '../middleware/error.js';
import { requireAdminKey } from '../middleware/adminAuth.js';
import { getPrisma, isDatabaseConfigured } from '../lib/prisma.js';
import {
  getPricingSnapshot,
  getSubscriptionDurationDays,
  subscriptionPublicFields,
} from '../lib/subscription.js';

function requireDb() { /* same as billing.ts */ }

export const adminRouter = Router();
adminRouter.use(requireAdminKey);

adminRouter.get('/pricing', asyncHandler(async (_req, res) => {
  const prisma = getPrisma();
  const snap = await getPricingSnapshot(prisma);
  const source =
    snap.priceSource === 'db' || snap.durationSource === 'db' ? 'db' : 'env';
  res.json({
    priceKopecks: snap.priceKopecks,
    durationDays: snap.durationDays,
    source,
  });
}));

adminRouter.put('/pricing', asyncHandler(async (req, res) => {
  const prisma = requireDb();
  const priceKopecks = req.body?.priceKopecks;
  const durationDays = req.body?.durationDays;
  if (priceKopecks !== undefined) {
    if (typeof priceKopecks !== 'number' || !Number.isFinite(priceKopecks) || priceKopecks < 1) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'priceKopecks must be a positive number.');
    }
  }
  if (durationDays !== undefined) {
    if (typeof durationDays !== 'number' || !Number.isInteger(durationDays) || durationDays < 1) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'durationDays must be a positive integer.');
    }
  }
  if (priceKopecks === undefined && durationDays === undefined) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Provide priceKopecks and/or durationDays.');
  }
  await prisma.appSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      subscriptionPriceKopecks:
        priceKopecks !== undefined ? Math.floor(priceKopecks) : null,
      subscriptionDurationDays:
        durationDays !== undefined ? durationDays : null,
    },
    update: {
      ...(priceKopecks !== undefined
        ? { subscriptionPriceKopecks: Math.floor(priceKopecks) }
        : {}),
      ...(durationDays !== undefined
        ? { subscriptionDurationDays: durationDays }
        : {}),
    },
  });
  const snap = await getPricingSnapshot(prisma);
  const source =
    snap.priceSource === 'db' || snap.durationSource === 'db' ? 'db' : 'env';
  res.json({
    priceKopecks: snap.priceKopecks,
    durationDays: snap.durationDays,
    source,
  });
}));

// GET /stats вЂ” prisma.user.count, active count with expiresAt gt now,
// payment aggregate confirmed, usageEvent counts by kind + createdAt gte

// GET /users?q= вЂ” OR filters on id equals, telegramId equals/contains,
// username contains (case-insensitive where supported), take 20

// POST /users/:id/subscription вЂ” activate/extend/revoke as spec
```

**Subscription action logic:**

```ts
const now = new Date();
if (action === 'activate') {
  const days =
    typeof body.days === 'number' && body.days > 0
      ? Math.floor(body.days)
      : await getSubscriptionDurationDays(prisma);
  const expiresAt = new Date(now);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + days);
  // update active + expiresAt
}
if (action === 'extend') {
  if (typeof body.days !== 'number' || !Number.isInteger(body.days) || body.days < 1) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'days required for extend.');
  }
  const base =
    user.subscriptionExpiresAt && user.subscriptionExpiresAt > now
      ? user.subscriptionExpiresAt
      : now;
  const expiresAt = new Date(base);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + body.days);
  // update active + expiresAt
}
if (action === 'revoke') {
  // status none, expiresAt null
}
```

Response user snapshot: `{ id, telegramId, username, firstName, lastName, ...subscriptionPublicFields(user) }`.

- [ ] **Step 4: Mount in `app.ts`**

```ts
import { adminRouter } from './routes/admin.js';
// cors methods: add PUT
// cors allowedHeaders: add 'X-Admin-Key'
app.use('/admin', adminRouter);
```

- [ ] **Step 5: Document env**

Append to `apps/ai-app/.env.example`:

```
# Admin API (ai-web server в†’ gateway). Required for /admin/* (fail-closed if unset).
# ADMIN_API_KEY=
```

Add `ADMIN_API_KEY` to `turbo.json` `dev` and `test` `passThroughEnv`.

- [ ] **Step 6: Run tests**

Run: `cd apps/ai-app && pnpm exec vitest run src/routes/admin.test.ts src/middleware/adminAuth.test.ts`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/ai-app/src/routes/admin.ts apps/ai-app/src/routes/admin.test.ts apps/ai-app/src/app.ts apps/ai-app/.env.example turbo.json
git commit -m "feat(ai-app): add /admin stats pricing and subscription management API"
```

---
