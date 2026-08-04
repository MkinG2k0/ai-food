### Task 4: `requireAdminKey` middleware

**Files:**
- Create: `apps/ai-app/src/middleware/adminAuth.ts`
- Create: `apps/ai-app/src/middleware/adminAuth.test.ts`

**Interfaces:**
- Produces: `export const requireAdminKey: RequestHandler`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { requireAdminKey } from './adminAuth.js';
import { ApiError } from '../../lib/errors.js';

function run(headers: Record<string, string>) {
  const req = {
    header: (name: string) => headers[name.toLowerCase()],
  } as unknown as Request;
  let err: unknown;
  let nextCalled = false;
  requireAdminKey(req, {} as Response, ((e?: unknown) => {
    nextCalled = true;
    err = e;
  }) as NextFunction);
  return { err, nextCalled };
}

describe('requireAdminKey', () => {
  const prev = process.env.ADMIN_API_KEY;
  afterEach(() => {
    if (prev === undefined) delete process.env.ADMIN_API_KEY;
    else process.env.ADMIN_API_KEY = prev;
  });

  it('rejects when ADMIN_API_KEY unset (fail-closed)', () => {
    delete process.env.ADMIN_API_KEY;
    const { err } = run({ 'x-admin-key': 'anything' });
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(401);
  });

  it('rejects missing or wrong key', () => {
    process.env.ADMIN_API_KEY = 'secret';
    expect((run({}).err as ApiError).status).toBe(401);
    expect((run({ 'x-admin-key': 'nope' }).err as ApiError).status).toBe(401);
  });

  it('calls next() on match', () => {
    process.env.ADMIN_API_KEY = 'secret';
    const { err, nextCalled } = run({ 'x-admin-key': 'secret' });
    expect(nextCalled).toBe(true);
    expect(err).toBeUndefined();
  });
});
```

Note: Express `req.header` lowercases names вЂ” implement using `req.header('x-admin-key')`.

- [ ] **Step 2: Run вЂ” expect FAIL**

Run: `cd apps/ai-app && pnpm exec vitest run src/middleware/adminAuth.test.ts`

Expected: FAIL (module missing)

- [ ] **Step 3: Implement**

```ts
import type { RequestHandler } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { ApiError } from '../../lib/errors.js';

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export const requireAdminKey: RequestHandler = (req, _res, next) => {
  const expected = process.env.ADMIN_API_KEY?.trim();
  if (!expected) {
    next(new ApiError(401, 'UNAUTHORIZED', 'Admin API key required.'));
    return;
  }
  const provided = req.header('x-admin-key')?.trim() ?? '';
  if (!provided || !safeEqual(provided, expected)) {
    next(new ApiError(401, 'UNAUTHORIZED', 'Valid admin API key required.'));
    return;
  }
  next();
};
```

- [ ] **Step 4: Run вЂ” expect PASS**

Run: `cd apps/ai-app && pnpm exec vitest run src/middleware/adminAuth.test.ts`

- [ ] **Step 5: Commit**

```bash
git add apps/ai-app/src/middleware/adminAuth.ts apps/ai-app/src/middleware/adminAuth.test.ts
git commit -m "feat(ai-app): add fail-closed requireAdminKey middleware"
```

---
