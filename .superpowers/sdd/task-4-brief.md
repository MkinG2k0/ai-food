### Task 4: `POST /usage/event` for manual/barcode

**Files:**
- Modify: `apps/ai-app/src/routes/usage.ts`
- Create: `apps/ai-app/src/routes/usage.event.test.ts`

**Interfaces:**
- Consumes: `X-Device-Id` required; optional `X-User-Token`; `ensureDevice`
- Produces: `POST /usage/event` body `{ kind: 'manual' | 'barcode' }` в†’ `{ ok: true }`; 400 other kinds; creates UsageEvent (no quota check)

- [ ] **Step 1: Failing tests**

```ts
it('records manual with device', async () => { /* 200, prisma.usageEvent.create called */ });
it('rejects analyze kind', async () => { /* 400 */ });
it('requires device id', async () => { /* 400 */ });
```

- [ ] **Step 2: Run вЂ” FAIL**

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

- [ ] **Step 4: Run вЂ” PASS**

- [ ] **Step 5: Commit**

```bash
git add apps/ai-app/src/routes/usage.ts apps/ai-app/src/routes/usage.event.test.ts
git commit -m "feat(ai-app): POST /usage/event for manual and barcode"
```

---

