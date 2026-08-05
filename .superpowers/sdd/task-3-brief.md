### Task 3: Auth consent API + publicUser fields

**Files:**
- Modify: `apps/ai-app/src/routes/auth.ts`
- Modify: `apps/ai-app/src/routes/auth.telegram.test.ts` and/or create `auth.consent.test.ts`
- Modify: `apps/ai-app/src/routes/auth.demo.test.ts` if asserts full user shape

**Interfaces:**
- Consumes: `DATA_CONSENT_VERSION`, JWT via `X-User-Token`
- Produces: `publicUser` includes `dataConsentAt: string | null`, `dataConsentVersion: string | null`
- Produces: `POST /auth/consent` body `{ version: string }` в†’ `publicUser`; 400 wrong version; 401 no/invalid token; idempotent if already set

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

- [ ] **Step 2: Run вЂ” expect FAIL**

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

- [ ] **Step 4: Run вЂ” expect PASS**

Run: `pnpm --filter openrouter-gateway exec vitest run src/routes/auth.consent.test.ts src/routes/auth.demo.test.ts src/routes/auth.telegram.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/ai-app/src/routes/auth.ts apps/ai-app/src/routes/auth.consent.test.ts apps/ai-app/src/routes/auth.demo.test.ts apps/ai-app/src/routes/auth.telegram.test.ts
git commit -m "feat(ai-app): POST /auth/consent and consent fields on user"
```

---

