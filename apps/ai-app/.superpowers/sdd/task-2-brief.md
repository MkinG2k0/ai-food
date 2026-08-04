### Task 2: Auth middleware + app shell + health

**Files:**
- Create: `src/middleware/auth.ts`
- Create: `src/routes/health.ts`
- Create: `src/app.ts`
- Create: `src/server.ts`
- Create: `src/app.test.ts` (start with health + auth cases; extend in later tasks)
- Test: `src/app.test.ts`

**Interfaces:**
- Consumes: `ApiError`, `errorHandler`, `asyncHandler`
- Produces: `requireApiKey: RequestHandler`
- Produces: `createApp(): Express`
- Produces: `healthRouter` mounted at `/health`

- [ ] **Step 1: Write failing auth/health tests in `src/app.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

vi.mock('openai');

import { createApp } from './app.js';

const ORIGINAL_API_KEY = process.env.API_KEY;
const ORIGINAL_OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

describe('gateway app', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
    delete process.env.API_KEY;
  });

  afterEach(() => {
    if (ORIGINAL_API_KEY === undefined) delete process.env.API_KEY;
    else process.env.API_KEY = ORIGINAL_API_KEY;
    if (ORIGINAL_OPENROUTER_KEY === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = ORIGINAL_OPENROUTER_KEY;
  });

  it('GET /health returns 200 { status: ok } without API key even when API_KEY is set', async () => {
    process.env.API_KEY = 'secret-gateway-key';
    const res = await request(createApp()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('rejects /v1/models with 401 when API_KEY set and missing', async () => {
    process.env.API_KEY = 'secret-gateway-key';
    // models route may 404 until Task 3 вЂ” for now mount a stub in app OR skip until Task 3.
    // Prefer implementing requireApiKey on a test-only mount first:
  });
});
```

Prefer a focused unit test file for auth instead of incomplete stub:

Create `src/middleware/auth.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { requireApiKey } from './auth.js';
import { errorHandler } from './error.js';

const ORIGINAL = process.env.API_KEY;

function appWithAuth() {
  const app = express();
  app.get('/v1/secure', requireApiKey, (_req, res) => {
    res.json({ ok: true });
  });
  app.use(errorHandler);
  return app;
}

describe('requireApiKey', () => {
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.API_KEY;
    else process.env.API_KEY = ORIGINAL;
  });

  it('allows when API_KEY unset', async () => {
    delete process.env.API_KEY;
    const res = await request(appWithAuth()).get('/v1/secure');
    expect(res.status).toBe(200);
  });

  it('401 when API_KEY set and header missing', async () => {
    process.env.API_KEY = 'secret';
    const res = await request(appWithAuth()).get('/v1/secure');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('allows Bearer token', async () => {
    process.env.API_KEY = 'secret';
    const res = await request(appWithAuth())
      .get('/v1/secure')
      .set('Authorization', 'Bearer secret');
    expect(res.status).toBe(200);
  });

  it('allows X-API-Key', async () => {
    process.env.API_KEY = 'secret';
    const res = await request(appWithAuth())
      .get('/v1/secure')
      .set('X-API-Key', 'secret');
    expect(res.status).toBe(200);
  });
});
```

And health test in `src/routes/health.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

describe('GET /health', () => {
  it('returns { status: ok }', async () => {
    const res = await request(createApp()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
```

- [ ] **Step 2: Run tests вЂ” expect FAIL**

Run: `npx vitest run src/middleware/auth.test.ts src/routes/health.test.ts`
Expected: FAIL (missing modules)

- [ ] **Step 3: Implement `src/middleware/auth.ts`**

```ts
import type { RequestHandler } from 'express';
import { ApiError } from '../../lib/errors.js';

export const requireApiKey: RequestHandler = (req, _res, next) => {
  const expected = process.env.API_KEY;
  if (!expected) {
    next();
    return;
  }

  const authHeader = req.header('authorization');
  const bearer =
    authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : undefined;
  const headerKey = req.header('x-api-key')?.trim();
  const provided = bearer || headerKey;

  if (!provided || provided !== expected) {
    next(new ApiError(401, 'UNAUTHORIZED', 'Valid API key required.'));
    return;
  }

  next();
};
```

- [ ] **Step 4: Implement `src/routes/health.ts`**

```ts
import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({ status: 'ok' });
});
```

- [ ] **Step 5: Implement `src/app.ts`**

```ts
import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/error.js';
import { requireApiKey } from './middleware/auth.js';
import { healthRouter } from './routes/health.js';

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: '*',
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    }),
  );
  app.use(express.json({ limit: '10mb' }));

  app.use('/health', healthRouter);

  // /v1 routes mounted in later tasks; apply requireApiKey to the /v1 router
  const v1 = express.Router();
  v1.use(requireApiKey);
  app.use('/v1', v1);

  app.use(errorHandler);
  return app;
}
```

Note: In Tasks 3вЂ“4, mount models/chat/embeddings on `v1` before exporting, or keep separate routers and `v1.use(modelsRouter)` etc. Refactor `createApp` in those tasks to attach real routers.

- [ ] **Step 6: Implement `src/server.ts`**

```ts
import { createApp } from './app.js';

const port = Number(process.env.PORT) || 3000;
const app = createApp();

app.listen(port, () => {
  console.log(`openrouter-gateway listening on http://localhost:${port}`);
});
```

- [ ] **Step 7: Run tests вЂ” expect PASS**

Run: `npx vitest run src/middleware/auth.test.ts src/routes/health.test.ts src/middleware/error.test.ts`
Expected: all PASS

- [ ] **Step 8: Commit**

```bash
git add src/middleware/auth.ts src/middleware/auth.test.ts src/routes/health.ts src/routes/health.test.ts src/app.ts src/server.ts
git commit -m "feat: add Express app shell, auth, and health"
```

---
