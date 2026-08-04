### Task 1: JWT — `phone` → `telegramId`

**Files:**
- Modify: `apps/ai-app/src/lib/jwt.ts`
- Modify: `apps/ai-app/src/lib/jwt.test.ts`
- Modify: `apps/ai-app/src/middleware/quota.test.ts` (mock payloads)
- Modify: `apps/ai-app/src/routes/billing.test.ts` (mock payloads)

**Interfaces:**
- Consumes: none
- Produces: `UserTokenPayload = { sub: string; telegramId: string }`; `signUserToken` / `verifyUserToken` use `telegramId` claim

- [ ] **Step 1: Update failing expectations in `jwt.test.ts`**

Replace phone-based cases with:

```ts
it('round-trips sub and telegramId', async () => {
  const token = await signUserToken({ sub: 'user_1', telegramId: '42' });
  const payload = await verifyUserToken(token);
  expect(payload).toEqual({ sub: 'user_1', telegramId: '42' });
});
```

Also update any other `phone` usages in that file to `telegramId: '42'`.

- [ ] **Step 2: Run test — expect FAIL (still signs `phone`)**

Run: `cd apps/ai-app && pnpm exec vitest run src/lib/jwt.test.ts`
Expected: FAIL (missing `telegramId` / unexpected `phone`)

- [ ] **Step 3: Implement JWT**

Replace `apps/ai-app/src/lib/jwt.ts` contents with:

```ts
import { SignJWT, jwtVerify } from 'jose';
import { ApiError } from '../../lib/errors.js';

export type UserTokenPayload = {
  sub: string;
  telegramId: string;
};

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new ApiError(
      500,
      'AUTH_MISCONFIGURED',
      'AUTH_SECRET must be set (at least 32 characters).',
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signUserToken(payload: UserTokenPayload): Promise<string> {
  return new SignJWT({ telegramId: payload.telegramId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .sign(getSecretKey());
}

export async function verifyUserToken(token: string): Promise<UserTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const sub = payload.sub;
    const telegramId = payload.telegramId;
    if (!sub || typeof telegramId !== 'string') {
      throw new Error('invalid claims');
    }
    return { sub, telegramId };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(401, 'INVALID_USER_TOKEN', 'Invalid or expired user token.');
  }
}
```

- [ ] **Step 4: Fix test mocks that still return `phone`**

In `quota.test.ts` and `billing.test.ts`, change mock resolved values from `{ sub, phone: '…' }` to `{ sub, telegramId: '42' }` (keep existing `sub` strings).

- [ ] **Step 5: Run tests**

Run: `cd apps/ai-app && pnpm exec vitest run src/lib/jwt.test.ts src/middleware/quota.test.ts src/routes/billing.test.ts`
Expected: PASS (auth route tests may still fail if run later — do not run flashcall suite yet)

- [ ] **Step 6: Commit**

```bash
git add apps/ai-app/src/lib/jwt.ts apps/ai-app/src/lib/jwt.test.ts apps/ai-app/src/middleware/quota.test.ts apps/ai-app/src/routes/billing.test.ts
git commit -m "refactor(ai-app): JWT claims use telegramId instead of phone"
```

---

