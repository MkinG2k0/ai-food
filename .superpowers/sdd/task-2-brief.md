### Task 2: Gateway `DELETE /admin/payments/:id`

**Files:**
- Modify: `apps/ai-app/src/routes/admin.ts`
- Modify: `apps/ai-app/src/routes/admin.test.ts`

**Interfaces:**
- Consumes: `paymentResponse` helper from Task 1 (optional), `requireDb()`, mock `payment.delete` / `user.update` / `$transaction`
- Produces: `DELETE /admin/payments/:id` в†’ `{ ok: true, revokedSubscription: boolean }`

- [ ] **Step 1: Write failing DELETE tests**

Append to `admin.test.ts`:

```ts
it('DELETE /admin/payments/:id deletes confirmed payment and revokes subscription', async () => {
  const response = await request(createApp())
    .delete('/admin/payments/pay-confirmed')
    .set('X-Admin-Key', 'test-admin');

  expect(response.status).toBe(200);
  expect(response.body).toEqual({ ok: true, revokedSubscription: true });
  expect(payments.find((p) => p.id === 'pay-confirmed')).toBeUndefined();
  expect(users.find((u) => u.id === 'user-2')).toMatchObject({
    subscriptionStatus: 'none',
    subscriptionExpiresAt: null,
  });
});

it('DELETE /admin/payments/:id deletes pending payment without revoking', async () => {
  const before = users.find((u) => u.id === 'user-1')!;
  const response = await request(createApp())
    .delete('/admin/payments/pay-pending')
    .set('X-Admin-Key', 'test-admin');

  expect(response.status).toBe(200);
  expect(response.body).toEqual({ ok: true, revokedSubscription: false });
  expect(payments.find((p) => p.id === 'pay-pending')).toBeUndefined();
  expect(users.find((u) => u.id === 'user-1')).toEqual(before);
});

it('DELETE /admin/payments/:id returns 404 for missing payment', async () => {
  const response = await request(createApp())
    .delete('/admin/payments/missing')
    .set('X-Admin-Key', 'test-admin');

  expect(response.status).toBe(404);
  expect(response.body.code).toBe('NOT_FOUND');
});

it('DELETE /admin/payments/:id rejects requests without admin key', async () => {
  const response = await request(createApp()).delete(
    '/admin/payments/pay-pending',
  );
  expect(response.status).toBe(401);
});
```

- [ ] **Step 2: Run tests вЂ” expect FAIL**

Run:

```bash
pnpm --filter openrouter-gateway exec vitest run src/routes/admin.test.ts
```

Expected: FAIL on DELETE cases (404 / missing route).

- [ ] **Step 3: Implement `DELETE /admin/payments/:id`**

Append to `apps/ai-app/src/routes/admin.ts`:

```ts
adminRouter.delete(
  '/payments/:id',
  asyncHandler(async (req, res) => {
    const prisma = requireDb();
    const paymentId = req.params.id;

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
      });
      if (!payment) {
        throw new ApiError(404, 'NOT_FOUND', 'Payment not found.');
      }

      await tx.payment.delete({ where: { id: payment.id } });

      const revokedSubscription = payment.status === 'confirmed';
      if (revokedSubscription) {
        await tx.user.update({
          where: { id: payment.userId },
          data: {
            subscriptionStatus: 'none',
            subscriptionExpiresAt: null,
          },
        });
      }

      return { ok: true as const, revokedSubscription };
    });

    res.json(result);
  }),
);
```

Note: if `ApiError` thrown inside `$transaction` is not rethrown cleanly by Prisma in this codebase, catch after findUnique outside the transaction instead вЂ” preferred equivalent:

```ts
adminRouter.delete(
  '/payments/:id',
  asyncHandler(async (req, res) => {
    const prisma = requireDb();
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
    });
    if (!payment) {
      throw new ApiError(404, 'NOT_FOUND', 'Payment not found.');
    }

    const revokedSubscription = payment.status === 'confirmed';

    await prisma.$transaction(async (tx) => {
      await tx.payment.delete({ where: { id: payment.id } });
      if (revokedSubscription) {
        await tx.user.update({
          where: { id: payment.userId },
          data: {
            subscriptionStatus: 'none',
            subscriptionExpiresAt: null,
          },
        });
      }
    });

    res.json({ ok: true, revokedSubscription });
  }),
);
```

Use the **second** (preferred) form so 404 stays outside the transaction.

- [ ] **Step 4: Run full admin tests вЂ” expect PASS**

Run:

```bash
pnpm --filter openrouter-gateway exec vitest run src/routes/admin.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/ai-app/src/routes/admin.ts apps/ai-app/src/routes/admin.test.ts
git commit -m "$(cat <<'EOF'
feat(ai-app): delete admin payments and revoke on confirmed

EOF
)"
```

---

