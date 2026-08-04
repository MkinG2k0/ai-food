# Payment Refund → Deactivate License Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On T-Bank `REFUNDED`, mark the payment `refunded` and deactivate the year license unless a newer confirmed payment owns access.

**Architecture:** Add `deactivateLicense` + `applyFullRefund` in `subscription.ts`. Call `applyFullRefund` from `/billing/tbank/notification` and `/billing/sync`. No schema migration (`refunded` / `canceled` enums already exist).

**Tech Stack:** Express, Prisma/Postgres, Vitest + supertest, T-Bank notification Token verification (existing).

**Spec:** `apps/ai-app/docs/superpowers/specs/2026-08-04-payment-refund-deactivate-design.md`

## Global Constraints

- Full refund only: T-Bank status `REFUNDED` → payment `refunded` + conditional deactivate.
- `PARTIAL_REFUNDED` → no payment/subscription changes.
- Pending fails (`REJECTED` / `CANCELED` / `DEADLINE_EXPIRED`) stay as today: `pending` → `rejected` only.
- `CANCELED` on already `confirmed` → no-op (post-capture full return is `REFUNDED`).
- Deactivate: `subscriptionStatus = 'canceled'`, `subscriptionExpiresAt = null`.
- Ownership: deactivate only if there is **no** `confirmed` payment for the same user with `createdAt` **greater than** this payment’s `createdAt`.
- Idempotent: second `REFUNDED` on already `refunded` → `OK`, no second deactivate required.
- No new env vars; no `ai-food` UI changes; no calling T-Bank `Cancel` from the app.

## File structure

| Path | Responsibility |
|------|----------------|
| `apps/ai-app/src/lib/subscription.ts` | `deactivateLicense`, `applyFullRefund` |
| `apps/ai-app/src/lib/subscription.test.ts` | Unit tests for both helpers |
| `apps/ai-app/src/routes/billing.ts` | Wire notification + sync to `applyFullRefund` |
| `apps/ai-app/src/routes/billing.test.ts` | Route tests for REFUNDED / PARTIAL / ownership / sync |

---

### Task 1: `deactivateLicense`

**Files:**
- Modify: `apps/ai-app/src/lib/subscription.ts`
- Modify: `apps/ai-app/src/lib/subscription.test.ts`

**Interfaces:**
- Consumes: `PrismaClient` (same as `activateYearLicense`)
- Produces: `deactivateLicense(prisma: PrismaClient, userId: string): Promise<void>`

- [ ] **Step 1: Write the failing test**

Append to `apps/ai-app/src/lib/subscription.test.ts` (import `deactivateLicense`):

```ts
  it('deactivateLicense sets canceled + clears expiresAt', async () => {
    const update = vi.fn().mockResolvedValue({});
    const prisma = { user: { update } } as never;
    await deactivateLicense(prisma, 'user-1');
    expect(update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        subscriptionStatus: 'canceled',
        subscriptionExpiresAt: null,
      },
    });
  });

  it('hasActiveSubscription false when canceled', () => {
    expect(
      hasActiveSubscription({
        subscriptionStatus: 'canceled',
        subscriptionExpiresAt: new Date(Date.now() + 86_400_000),
      }),
    ).toBe(false);
  });
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `cd apps/ai-app && pnpm exec vitest run src/lib/subscription.test.ts`

Expected: FAIL (`deactivateLicense` is not exported / not a function)

- [ ] **Step 3: Implement `deactivateLicense`**

Add to `apps/ai-app/src/lib/subscription.ts` after `activateYearLicense`:

```ts
/** Revokes paid access. Caller owns idempotency / ownership checks. */
export async function deactivateLicense(
  prisma: PrismaClient,
  userId: string,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionStatus: 'canceled',
      subscriptionExpiresAt: null,
    },
  });
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `cd apps/ai-app && pnpm exec vitest run src/lib/subscription.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/ai-app/src/lib/subscription.ts apps/ai-app/src/lib/subscription.test.ts
git commit -m "$(cat <<'EOF'
feat(billing): add deactivateLicense for refunded year licenses

EOF
)"
```

---

### Task 2: `applyFullRefund` helper

**Files:**
- Modify: `apps/ai-app/src/lib/subscription.ts`
- Modify: `apps/ai-app/src/lib/subscription.test.ts`

**Interfaces:**
- Consumes: `deactivateLicense`
- Produces:

```ts
export type RefundablePayment = {
  id: string;
  userId: string;
  status: string;
  createdAt: Date;
};

/** Marks payment refunded; deactivates license unless a newer confirmed payment exists. */
export async function applyFullRefund(
  prisma: PrismaClient,
  payment: RefundablePayment,
): Promise<{ deactivated: boolean }>
```

- [ ] **Step 1: Write the failing tests**

Append to `subscription.test.ts` (import `applyFullRefund`):

```ts
  it('applyFullRefund no-ops when already refunded', async () => {
    const paymentUpdate = vi.fn();
    const userUpdate = vi.fn();
    const findFirst = vi.fn();
    const prisma = {
      payment: { update: paymentUpdate, findFirst },
      user: { update: userUpdate },
    } as never;
    const result = await applyFullRefund(prisma, {
      id: 'pay_1',
      userId: 'user-1',
      status: 'refunded',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    expect(result).toEqual({ deactivated: false });
    expect(paymentUpdate).not.toHaveBeenCalled();
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it('applyFullRefund marks refunded and deactivates when no newer confirmed', async () => {
    const paymentUpdate = vi.fn().mockResolvedValue({});
    const userUpdate = vi.fn().mockResolvedValue({});
    const findFirst = vi.fn().mockResolvedValue(null);
    const prisma = {
      payment: { update: paymentUpdate, findFirst },
      user: { update: userUpdate },
    } as never;
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const result = await applyFullRefund(prisma, {
      id: 'pay_1',
      userId: 'user-1',
      status: 'confirmed',
      createdAt,
    });
    expect(result).toEqual({ deactivated: true });
    expect(paymentUpdate).toHaveBeenCalledWith({
      where: { id: 'pay_1' },
      data: { status: 'refunded' },
    });
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        status: 'confirmed',
        createdAt: { gt: createdAt },
      },
    });
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        subscriptionStatus: 'canceled',
        subscriptionExpiresAt: null,
      },
    });
  });

  it('applyFullRefund does not deactivate when newer confirmed exists', async () => {
    const paymentUpdate = vi.fn().mockResolvedValue({});
    const userUpdate = vi.fn();
    const findFirst = vi.fn().mockResolvedValue({ id: 'pay_2' });
    const prisma = {
      payment: { update: paymentUpdate, findFirst },
      user: { update: userUpdate },
    } as never;
    const result = await applyFullRefund(prisma, {
      id: 'pay_1',
      userId: 'user-1',
      status: 'confirmed',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    expect(result).toEqual({ deactivated: false });
    expect(paymentUpdate).toHaveBeenCalled();
    expect(userUpdate).not.toHaveBeenCalled();
  });
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `cd apps/ai-app && pnpm exec vitest run src/lib/subscription.test.ts`

Expected: FAIL (`applyFullRefund` is not exported)

- [ ] **Step 3: Implement `applyFullRefund`**

Add to `apps/ai-app/src/lib/subscription.ts`:

```ts
export type RefundablePayment = {
  id: string;
  userId: string;
  status: string;
  createdAt: Date;
};

/**
 * Marks payment refunded. Deactivates license unless a newer confirmed
 * payment exists for the same user (ownership rule).
 */
export async function applyFullRefund(
  prisma: PrismaClient,
  payment: RefundablePayment,
): Promise<{ deactivated: boolean }> {
  if (payment.status === 'refunded') {
    return { deactivated: false };
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: 'refunded' },
  });

  const newerConfirmed = await prisma.payment.findFirst({
    where: {
      userId: payment.userId,
      status: 'confirmed',
      createdAt: { gt: payment.createdAt },
    },
  });

  if (!newerConfirmed) {
    await deactivateLicense(prisma, payment.userId);
    return { deactivated: true };
  }

  return { deactivated: false };
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `cd apps/ai-app && pnpm exec vitest run src/lib/subscription.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/ai-app/src/lib/subscription.ts apps/ai-app/src/lib/subscription.test.ts
git commit -m "$(cat <<'EOF'
feat(billing): applyFullRefund with newer-payment ownership check

EOF
)"
```

---

### Task 3: Wire notification + sync; route tests

**Files:**
- Modify: `apps/ai-app/src/routes/billing.ts`
- Modify: `apps/ai-app/src/routes/billing.test.ts`

**Interfaces:**
- Consumes: `applyFullRefund` from `../lib/subscription.js`
- Produces: webhook/`sync` behavior per spec (no new public routes)

- [ ] **Step 1: Extend billing test mocks**

In `apps/ai-app/src/routes/billing.test.ts`:

1. Add `const mockApplyFullRefund = vi.fn();`
2. In the `vi.mock('../lib/subscription.js', …)` factory, add:

```ts
    applyFullRefund: (...args: unknown[]) => mockApplyFullRefund(...args),
```

3. Extend `mockPrisma().payment.findFirst` so it can filter `createdAt: { gt }` if any test hits real prisma through unmocked paths — not required while `applyFullRefund` is mocked; keep existing `findFirst` as-is for sync pending lookup.

4. In `beforeEach`, default:

```ts
    mockApplyFullRefund.mockResolvedValue({ deactivated: true });
```

- [ ] **Step 2: Write failing route tests**

Append inside `describe('billing routes', …)`:

```ts
  function seedConfirmedPayment(overrides: Record<string, unknown> = {}) {
    const id = (overrides.id as string) ?? 'pay_confirmed';
    const row = {
      id,
      userId: 'user-1',
      amount: 199000,
      status: 'confirmed',
      tbankOrderId: id,
      tbankPaymentId: 'tb-55',
      paidAt: new Date('2026-08-01T00:00:00.000Z'),
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
      updatedAt: new Date('2026-08-01T00:00:00.000Z'),
      ...overrides,
    };
    paymentStore.set(id, row);
    return row;
  }

  it('POST /billing/tbank/notification REFUNDED calls applyFullRefund', async () => {
    seedConfirmedPayment();
    const notif = {
      TerminalKey: 'term-key',
      OrderId: 'pay_confirmed',
      PaymentId: 'tb-55',
      Status: 'REFUNDED',
      Success: true,
      Amount: 199000,
    };
    const token = buildTbankToken(notif, 'term-pass');
    const res = await request(createApp())
      .post('/billing/tbank/notification')
      .send({ ...notif, Token: token });
    expect(res.status).toBe(200);
    expect(res.text).toBe('OK');
    expect(mockApplyFullRefund).toHaveBeenCalledTimes(1);
    expect(mockApplyFullRefund.mock.calls[0][1]).toMatchObject({
      id: 'pay_confirmed',
      userId: 'user-1',
      status: 'confirmed',
    });
    expect(mockActivate).not.toHaveBeenCalled();
  });

  it('POST /billing/tbank/notification REFUNDED is idempotent when already refunded', async () => {
    seedConfirmedPayment({ status: 'refunded' });
    const notif = {
      TerminalKey: 'term-key',
      OrderId: 'pay_confirmed',
      PaymentId: 'tb-55',
      Status: 'REFUNDED',
      Success: true,
      Amount: 199000,
    };
    const token = buildTbankToken(notif, 'term-pass');
    const res = await request(createApp())
      .post('/billing/tbank/notification')
      .send({ ...notif, Token: token });
    expect(res.status).toBe(200);
    expect(res.text).toBe('OK');
    expect(mockApplyFullRefund).toHaveBeenCalledTimes(1);
  });

  it('POST /billing/tbank/notification PARTIAL_REFUNDED does not refund', async () => {
    seedConfirmedPayment();
    const notif = {
      TerminalKey: 'term-key',
      OrderId: 'pay_confirmed',
      PaymentId: 'tb-55',
      Status: 'PARTIAL_REFUNDED',
      Success: true,
      Amount: 199000,
    };
    const token = buildTbankToken(notif, 'term-pass');
    const res = await request(createApp())
      .post('/billing/tbank/notification')
      .send({ ...notif, Token: token });
    expect(res.status).toBe(200);
    expect(mockApplyFullRefund).not.toHaveBeenCalled();
    expect(paymentStore.get('pay_confirmed')?.status).toBe('confirmed');
  });

  it('POST /billing/tbank/notification CANCELED on pending rejects without deactivate', async () => {
    seedConfirmedPayment({
      id: 'pay_pending',
      tbankOrderId: 'pay_pending',
      status: 'pending',
      paidAt: null,
    });
    const notif = {
      TerminalKey: 'term-key',
      OrderId: 'pay_pending',
      PaymentId: 'tb-55',
      Status: 'CANCELED',
      Success: false,
      Amount: 199000,
    };
    const token = buildTbankToken(notif, 'term-pass');
    const res = await request(createApp())
      .post('/billing/tbank/notification')
      .send({ ...notif, Token: token });
    expect(res.status).toBe(200);
    expect(paymentStore.get('pay_pending')?.status).toBe('rejected');
    expect(mockApplyFullRefund).not.toHaveBeenCalled();
  });

  it('POST /billing/sync REFUNDED calls applyFullRefund', async () => {
    seedConfirmedPayment({ tbankPaymentId: 'tb-sync' });
    mockGetPaymentState.mockResolvedValue({ status: 'REFUNDED', success: true });
    const res = await request(createApp())
      .post('/billing/sync')
      .set('X-User-Token', 'jwt')
      .send({ paymentId: 'pay_confirmed' });
    expect(res.status).toBe(200);
    expect(mockApplyFullRefund).toHaveBeenCalledTimes(1);
    expect(res.body.paymentStatus).toBe('refunded');
    expect(res.body.tbankStatus).toBe('REFUNDED');
  });
```

- [ ] **Step 3: Run tests — expect FAIL**

Run: `cd apps/ai-app && pnpm exec vitest run src/routes/billing.test.ts`

Expected: FAIL (`mockApplyFullRefund` not called on REFUNDED / sync still ignores REFUNDED)

- [ ] **Step 4: Wire `billing.ts`**

1. Update import from `../lib/subscription.js`:

```ts
import {
  activateYearLicense,
  applyFullRefund,
  getSubscriptionPriceKopecks,
  subscriptionPublicFields,
} from '../lib/subscription.js';
```

2. In `/tbank/notification`, **after** the `CONFIRMED` block and **before** the pending-reject block, insert:

```ts
    if (status === 'REFUNDED') {
      await applyFullRefund(prisma, payment);
      res.status(200).send('OK');
      return;
    }
```

(`applyFullRefund` already no-ops when `payment.status === 'refunded'`.)

3. In `/billing/sync`, after the `CONFIRMED` branch and before the final `findUnique`/`res.json`, add handling so REFUNDED is applied. Replace the block that only handles CONFIRMED with:

```ts
    const state = await getPaymentState(payment.tbankPaymentId);
    let paymentStatus = payment.status;

    if (state.status === 'CONFIRMED') {
      const paidAt = new Date();
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'confirmed', paidAt },
      });
      await activateYearLicense(prisma, user.id, paidAt);
      paymentStatus = 'confirmed';
    } else if (state.status === 'REFUNDED') {
      await applyFullRefund(prisma, payment);
      paymentStatus = 'refunded';
    }

    const fresh = await prisma.user.findUnique({ where: { id: user.id } });
    res.json({
      paymentId: payment.id,
      paymentStatus,
      tbankStatus: state.status,
      ...(fresh ? subscriptionPublicFields(fresh) : {}),
    });
```

Remove the old `paymentStatus: state.status === 'CONFIRMED' ? 'confirmed' : payment.status` ternary that this replaces.

Do **not** change the early return when `payment.status === 'confirmed'` at the start of sync — for refunds after confirm, sync must still reach `getPaymentState`. Change that early return so confirmed payments are **not** short-circuited when we may need to sync refund:

Replace:

```ts
    if (payment.status === 'confirmed') {
      const fresh = await prisma.user.findUnique({ where: { id: user.id } });
      res.json({
        paymentId: payment.id,
        paymentStatus: payment.status,
        ...(fresh ? subscriptionPublicFields(fresh) : {}),
      });
      return;
    }
```

With:

```ts
    if (payment.status === 'refunded' || payment.status === 'rejected') {
      const fresh = await prisma.user.findUnique({ where: { id: user.id } });
      res.json({
        paymentId: payment.id,
        paymentStatus: payment.status,
        ...(fresh ? subscriptionPublicFields(fresh) : {}),
      });
      return;
    }
```

So `confirmed` payments still call `GetState` (can discover `REFUNDED`). Already `refunded`/`rejected` short-circuit.

Keep mock-mode sync behavior as today (auto-confirm); mock refund is out of scope.

- [ ] **Step 5: Run billing tests — expect PASS**

Run: `cd apps/ai-app && pnpm exec vitest run src/routes/billing.test.ts`

Expected: PASS

- [ ] **Step 6: Run full ai-app test suite**

Run: `cd apps/ai-app && pnpm test`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/ai-app/src/routes/billing.ts apps/ai-app/src/routes/billing.test.ts
git commit -m "$(cat <<'EOF'
feat(billing): deactivate license on T-Bank REFUNDED notification and sync

EOF
)"
```

- [ ] **Step 8: Mark spec status**

In `apps/ai-app/docs/superpowers/specs/2026-08-04-payment-refund-deactivate-design.md`, set:

`**Status:** Implemented`

Commit optional with docs-only message, or include in the previous commit if still uncommitted.

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| `deactivateLicense` → `canceled` + null expires | Task 1 |
| `REFUNDED` → `refunded` + conditional deactivate | Task 2–3 |
| Ownership: no newer `confirmed` | Task 2 |
| Idempotent repeat `REFUNDED` | Task 2–3 |
| `PARTIAL_REFUNDED` ignore | Task 3 |
| Pending `CANCELED` → `rejected`, no deactivate | Task 3 (existing + assert) |
| Sync fallback for `REFUNDED` | Task 3 |
| No schema migration / no UI | — (explicit non-work) |
