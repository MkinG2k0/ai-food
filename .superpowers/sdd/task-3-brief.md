### Task 3: In-memory Telegram login challenges

**Files:**
- Create: `apps/ai-app/src/lib/telegramLoginChallenge.ts`
- Create: `apps/ai-app/src/lib/telegramLoginChallenge.test.ts`

**Interfaces:**
- Consumes: none
- Produces:
  - `LoginChallengeStatus = 'pending' | 'confirmed' | 'consumed'`
  - `createLoginChallenge(opts?: { deviceId?: string; ttlMs?: number }): { id: string; nonce: string; expiresAt: Date }`
  - `getLoginChallengeById(id: string): Challenge | null`
  - `getLoginChallengeByNonce(nonce: string): Challenge | null`
  - `confirmLoginChallenge(nonce: string, opts: { userId: string; token: string }): boolean`
  - `consumeLoginChallenge(id: string): { token: string; userId: string } | null`
  - `clearAllLoginChallengesForTests(): void`
  - Challenge shape: `{ id, nonce, status, deviceId?, userId?, token?, expiresAt: number }`

- [ ] **Step 1: Write failing tests**

Create `apps/ai-app/src/lib/telegramLoginChallenge.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest';
import {
  clearAllLoginChallengesForTests,
  confirmLoginChallenge,
  consumeLoginChallenge,
  createLoginChallenge,
  getLoginChallengeByNonce,
} from './telegramLoginChallenge.js';

describe('telegramLoginChallenge', () => {
  afterEach(() => {
    clearAllLoginChallengesForTests();
  });

  it('create → confirm → consume → second consume null', () => {
    const { id, nonce } = createLoginChallenge({ deviceId: 'dev-1' });
    expect(getLoginChallengeByNonce(nonce)?.status).toBe('pending');

    expect(
      confirmLoginChallenge(nonce, { userId: 'u1', token: 'jwt-1' }),
    ).toBe(true);

    const first = consumeLoginChallenge(id);
    expect(first).toEqual({ userId: 'u1', token: 'jwt-1' });
    expect(consumeLoginChallenge(id)).toBeNull();
  });

  it('rejects confirm for unknown nonce', () => {
    expect(
      confirmLoginChallenge('nope', { userId: 'u1', token: 'jwt' }),
    ).toBe(false);
  });

  it('expires pending challenges', () => {
    const { id, nonce } = createLoginChallenge({ ttlMs: 1 });
    // force expiry
    const c = getLoginChallengeByNonce(nonce);
    expect(c).not.toBeNull();
    // wait > ttl
    const start = Date.now();
    while (Date.now() - start < 5) {
      /* spin */
    }
    expect(confirmLoginChallenge(nonce, { userId: 'u1', token: 'jwt' })).toBe(
      false,
    );
    expect(consumeLoginChallenge(id)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `cd apps/ai-app && pnpm exec vitest run src/lib/telegramLoginChallenge.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement challenge store**

Create `apps/ai-app/src/lib/telegramLoginChallenge.ts`:

```ts
import { randomBytes, randomUUID } from 'node:crypto';

const DEFAULT_TTL_MS = 5 * 60 * 1000;

export type LoginChallengeStatus = 'pending' | 'confirmed' | 'consumed';

export type LoginChallenge = {
  id: string;
  nonce: string;
  status: LoginChallengeStatus;
  deviceId?: string;
  userId?: string;
  token?: string;
  expiresAt: number;
};

const byId = new Map<string, LoginChallenge>();
const byNonce = new Map<string, string>(); // nonce → id

function isExpired(c: LoginChallenge, now = Date.now()): boolean {
  return now >= c.expiresAt;
}

function purgeIfExpired(id: string): LoginChallenge | null {
  const c = byId.get(id);
  if (!c) return null;
  if (isExpired(c) || c.status === 'consumed') {
    byId.delete(id);
    byNonce.delete(c.nonce);
    return null;
  }
  return c;
}

export function createLoginChallenge(opts?: {
  deviceId?: string;
  ttlMs?: number;
}): { id: string; nonce: string; expiresAt: Date } {
  const id = randomUUID();
  const nonce = randomBytes(24).toString('base64url');
  const expiresAt = Date.now() + (opts?.ttlMs ?? DEFAULT_TTL_MS);
  const challenge: LoginChallenge = {
    id,
    nonce,
    status: 'pending',
    expiresAt,
    ...(opts?.deviceId ? { deviceId: opts.deviceId } : {}),
  };
  byId.set(id, challenge);
  byNonce.set(nonce, id);
  return { id, nonce, expiresAt: new Date(expiresAt) };
}

export function getLoginChallengeById(id: string): LoginChallenge | null {
  return purgeIfExpired(id);
}

export function getLoginChallengeByNonce(nonce: string): LoginChallenge | null {
  const id = byNonce.get(nonce);
  if (!id) return null;
  return purgeIfExpired(id);
}

export function confirmLoginChallenge(
  nonce: string,
  opts: { userId: string; token: string },
): boolean {
  const c = getLoginChallengeByNonce(nonce);
  if (!c || c.status !== 'pending') return false;
  c.status = 'confirmed';
  c.userId = opts.userId;
  c.token = opts.token;
  return true;
}

export function consumeLoginChallenge(
  id: string,
): { token: string; userId: string } | null {
  const c = purgeIfExpired(id);
  if (!c || c.status !== 'confirmed' || !c.token || !c.userId) return null;
  const result = { token: c.token, userId: c.userId };
  c.status = 'consumed';
  byId.delete(id);
  byNonce.delete(c.nonce);
  return result;
}

export function clearAllLoginChallengesForTests(): void {
  byId.clear();
  byNonce.clear();
}
```

Fix the expiry test if flaky: prefer injecting `ttlMs: -1` or setting `expiresAt` in the past via a test-only helper — if spin wait is flaky, change test to:

```ts
it('expires pending challenges', () => {
  const { id, nonce } = createLoginChallenge({ ttlMs: -1 });
  expect(confirmLoginChallenge(nonce, { userId: 'u1', token: 'jwt' })).toBe(false);
  expect(consumeLoginChallenge(id)).toBeNull();
});
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `cd apps/ai-app && pnpm exec vitest run src/lib/telegramLoginChallenge.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/ai-app/src/lib/telegramLoginChallenge.ts apps/ai-app/src/lib/telegramLoginChallenge.test.ts
git commit -m "feat(ai-app): add Telegram login challenge store"
```

---

