# Express Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Vercel Functions with a long-running Express.js OpenRouter gateway while keeping the public REST contract, auth, CORS, errors, and SSE streaming.

**Architecture:** Express app factory in `src/app.ts` (testable via supertest); `src/server.ts` listens on `PORT`. Routes under `src/routes/`; auth/error middleware under `src/middleware/`. Keep `lib/openai.ts`, `lib/queue.ts`, `lib/types.ts`; rewrite `lib/errors.ts` for Express; delete Web Fetch helpers and all Vercel artifacts.

**Tech Stack:** Express, cors, tsx, zod, openai SDK (OpenRouter baseURL), vitest, supertest, TypeScript ESM (`"type": "module"`).

## Global Constraints

- Public paths unchanged: `/health`, `/v1/models`, `/v1/chat/completions`, `/v1/embeddings`
- Error body always `{ message, code, status }`
- Auth: optional `API_KEY` via Bearer or `X-API-Key`; `/health` always open
- JSON body limit 10 MB
- Stream timeout 120_000 ms; non-stream client timeout 30_000 ms (existing `lib/openai.ts`)
- Concurrency pool limit 5 via `runOpenAI` / `runOpenAIHeld`
- No Vercel left (config, dep, scripts, docs)
- Run TS with `tsx` — no emit for `start`/`dev`
- Spec: `docs/superpowers/specs/2026-08-03-express-migration-design.md`

---

## File Structure

| Path | Responsibility |
|------|----------------|
| `src/server.ts` | `app.listen(PORT)` |
| `src/app.ts` | Create Express app, mount middleware + routes |
| `src/middleware/auth.ts` | `requireApiKey` Express middleware |
| `src/middleware/error.ts` | Map body-parser + gateway errors to JSON |
| `src/routes/health.ts` | `GET /health` |
| `src/routes/models.ts` | `GET /v1/models` |
| `src/routes/chat.ts` | `POST /v1/chat/completions` (+ SSE) |
| `src/routes/embeddings.ts` | `POST /v1/embeddings` |
| `src/app.test.ts` | Supertest coverage (replaces the former Vercel-era `api/gateway.test.ts`, removed after migration) |
| `lib/errors.ts` | `ApiError` class + `mapOpenAIError` + `sendApiError` |
| `lib/openai.ts` | Unchanged behavior |
| `lib/queue.ts` | Unchanged |
| `lib/types.ts` | Unchanged |
| Delete | `api/**`, `vercel.json`, `lib/cors.ts`, `lib/request.ts` |

---

### Task 1: Scaffold Express project + rewrite error helpers

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`
- Modify: `vitest.config.ts`
- Modify: `lib/errors.ts`
- Delete after later tasks (do not delete yet if imports break mid-migration): keep `api/` until Task 5
- Create: `src/middleware/error.ts`
- Test: `src/middleware/error.test.ts`

**Interfaces:**
- Produces: `class ApiError extends Error { status: number; code: string; message: string }`
- Produces: `sendApiError(res, status, code, message): void`
- Produces: `mapOpenAIError(error: unknown): { status, code, message }` (same mapping as today)
- Produces: `errorHandler(err, req, res, next): void` Express error middleware
- Produces: `asyncHandler(fn)` wrapper that forwards rejections to `next`

- [ ] **Step 1: Update `package.json`**

Replace scripts and dependencies as follows (keep `openai`, `zod`, `vitest`, `typescript`, `@types/node`):

```json
{
  "name": "openrouter-gateway",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch --env-file=.env src/server.ts",
    "start": "tsx --env-file=.env src/server.ts",
    "test": "vitest run",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.21.2",
    "openai": "^6.45.0",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^20.14.10",
    "@types/supertest": "^6.0.2",
    "supertest": "^7.0.0",
    "tsx": "^4.19.2",
    "typescript": "^5.5.3",
    "vitest": "^2"
  }
}
```

If `--env-file` fails on older Node (<20.6), fall back to adding `dotenv` and `import 'dotenv/config'` in `src/server.ts` — prefer `--env-file` first.

- [ ] **Step 2: Install**

Run: `npm uninstall vercel && npm install && npm install -D tsx @types/express @types/cors supertest @types/supertest && npm install express cors`

Expected: `package-lock.json` updated; no `vercel` in dependencies.

- [ ] **Step 3: Update `tsconfig.json` include**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022", "DOM"],
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "types": ["node"]
  },
  "include": ["src", "lib"],
  "exclude": ["node_modules", "**/*.test.ts"]
}
```

- [ ] **Step 4: Update `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts', 'lib/**/*.test.ts'],
  },
});
```

- [ ] **Step 5: Write failing test for `ApiError` / error handler**

Create `src/middleware/error.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { ApiError } from '../../lib/errors.js';
import { errorHandler, asyncHandler } from './error.js';

function buildApp() {
  const app = express();
  app.get(
    '/boom',
    asyncHandler(async () => {
      throw new ApiError(401, 'UNAUTHORIZED', 'Valid API key required.');
    }),
  );
  app.get(
    '/raw',
    asyncHandler(async () => {
      throw new Error('secret internals');
    }),
  );
  app.use(errorHandler);
  return app;
}

describe('errorHandler', () => {
  it('sends ApiError as { message, code, status }', async () => {
    const res = await request(buildApp()).get('/boom');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      message: 'Valid API key required.',
      code: 'UNAUTHORIZED',
      status: 401,
    });
  });

  it('maps unknown errors to 500 UPSTREAM_ERROR without leaking message', async () => {
    const res = await request(buildApp()).get('/raw');
    expect(res.status).toBe(500);
    expect(res.body.code).toBe('UPSTREAM_ERROR');
    expect(res.body.message).not.toContain('secret');
  });
});
```

- [ ] **Step 6: Run test — expect FAIL**

Run: `npx vitest run src/middleware/error.test.ts`
Expected: FAIL (module not found / cannot resolve)

- [ ] **Step 7: Rewrite `lib/errors.ts`**

```ts
import OpenAI from 'openai';
import type { Response } from 'express';
import type { ApiError as ApiErrorBody } from './types.js';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export function sendApiError(
  res: Response,
  status: number,
  code: string,
  message: string,
): void {
  const body: ApiErrorBody = { message, code, status };
  res.status(status).json(body);
}

export function mapOpenAIError(error: unknown): {
  status: number;
  code: string;
  message: string;
} {
  if (error instanceof OpenAI.RateLimitError) {
    return {
      status: 429,
      code: 'RATE_LIMITED',
      message: 'OpenRouter rate limit exceeded. Please try again later.',
    };
  }

  if (error instanceof OpenAI.APIConnectionTimeoutError) {
    return {
      status: 504,
      code: 'UPSTREAM_TIMEOUT',
      message: 'Upstream request timed out. Please try again.',
    };
  }

  if (error instanceof OpenAI.BadRequestError) {
    return {
      status: 400,
      code: 'BAD_REQUEST',
      message: 'The request could not be processed by the upstream provider.',
    };
  }

  return {
    status: 500,
    code: 'UPSTREAM_ERROR',
    message: 'Upstream request failed. Please try again.',
  };
}
```

- [ ] **Step 8: Create `src/middleware/error.ts`**

```ts
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ApiError, sendApiError } from '../../lib/errors.js';

export function asyncHandler(
  fn: (req: Parameters<RequestHandler>[0], res: Parameters<RequestHandler>[1], next: Parameters<RequestHandler>[2]) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    void fn(req, res, next).catch(next);
  };
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ApiError) {
    sendApiError(res, err.status, err.code, err.message);
    return;
  }

  // body-parser / express.json errors
  if (err?.type === 'entity.too.large') {
    sendApiError(res, 413, 'PAYLOAD_TOO_LARGE', 'Request body exceeds 10 MB limit.');
    return;
  }

  if (err instanceof SyntaxError && 'body' in err) {
    sendApiError(res, 400, 'VALIDATION_ERROR', 'Invalid JSON body.');
    return;
  }

  console.error('Unhandled error:', err);
  sendApiError(res, 500, 'UPSTREAM_ERROR', 'Upstream request failed. Please try again.');
};
```

- [ ] **Step 9: Run test — expect PASS**

Run: `npx vitest run src/middleware/error.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts lib/errors.ts src/middleware/error.ts src/middleware/error.test.ts
git commit -m "feat: scaffold Express and rewrite error helpers"
```

---

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
    // models route may 404 until Task 3 — for now mount a stub in app OR skip until Task 3.
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

- [ ] **Step 2: Run tests — expect FAIL**

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

Note: In Tasks 3–4, mount models/chat/embeddings on `v1` before exporting, or keep separate routers and `v1.use(modelsRouter)` etc. Refactor `createApp` in those tasks to attach real routers.

- [ ] **Step 6: Implement `src/server.ts`**

```ts
import { createApp } from './app.js';

const port = Number(process.env.PORT) || 3000;
const app = createApp();

app.listen(port, () => {
  console.log(`openrouter-gateway listening on http://localhost:${port}`);
});
```

- [ ] **Step 7: Run tests — expect PASS**

Run: `npx vitest run src/middleware/auth.test.ts src/routes/health.test.ts src/middleware/error.test.ts`
Expected: all PASS

- [ ] **Step 8: Commit**

```bash
git add src/middleware/auth.ts src/middleware/auth.test.ts src/routes/health.ts src/routes/health.test.ts src/app.ts src/server.ts
git commit -m "feat: add Express app shell, auth, and health"
```

---

### Task 3: Models + embeddings routes

**Files:**
- Create: `src/routes/models.ts`
- Create: `src/routes/embeddings.ts`
- Modify: `src/app.ts` — mount routers on `/v1`
- Modify: `src/app.test.ts` — models/embeddings/auth integration cases
- Test: `src/app.test.ts`

**Interfaces:**
- Consumes: `runOpenAI`, `mapOpenAIError`, `ApiError`, `asyncHandler`, `requireApiKey`
- Produces: `modelsRouter` with `GET /` → mounted as `/v1/models`
- Produces: `embeddingsRouter` with `POST /` → mounted as `/v1/embeddings`

- [ ] **Step 1: Write failing tests in `src/app.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import OpenAI from 'openai';

vi.mock('openai');

import { createApp } from './app.js';

const ORIGINAL_API_KEY = process.env.API_KEY;
const ORIGINAL_OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

function mockOpenAI(partial: {
  listModels?: ReturnType<typeof vi.fn>;
  createChat?: ReturnType<typeof vi.fn>;
  createEmbeddings?: ReturnType<typeof vi.fn>;
}) {
  vi.mocked(OpenAI).mockImplementation(
    () =>
      ({
        models: { list: partial.listModels ?? vi.fn() },
        chat: { completions: { create: partial.createChat ?? vi.fn() } },
        embeddings: { create: partial.createEmbeddings ?? vi.fn() },
      }) as unknown as OpenAI,
  );
}

describe('gateway /v1 models + embeddings', () => {
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

  it('GET /v1/models returns 200 with data array', async () => {
    const listModels = vi.fn().mockResolvedValue({
      data: [{ id: 'gpt-4o-mini', object: 'model' }],
      object: 'list',
    });
    mockOpenAI({ listModels });

    const res = await request(createApp()).get('/v1/models');
    expect(res.status).toBe(200);
    expect(res.body.data[0].id).toBe('gpt-4o-mini');
  });

  it('POST /v1/embeddings returns embeddings JSON', async () => {
    const createEmbeddings = vi.fn().mockResolvedValue({
      data: [{ embedding: [0.1, 0.2], index: 0 }],
      model: 'text-embedding-3-small',
    });
    mockOpenAI({ createEmbeddings });

    const res = await request(createApp())
      .post('/v1/embeddings')
      .send({ model: 'text-embedding-3-small', input: 'hello' });
    expect(res.status).toBe(200);
    expect(res.body.data[0].embedding).toEqual([0.1, 0.2]);
  });

  it('rejects protected routes with 401 when API_KEY set and missing', async () => {
    process.env.API_KEY = 'secret-gateway-key';
    mockOpenAI({});
    const res = await request(createApp()).get('/v1/models');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('allows protected routes with valid Bearer token', async () => {
    process.env.API_KEY = 'secret-gateway-key';
    const listModels = vi.fn().mockResolvedValue({
      data: [{ id: 'gpt-4o-mini', object: 'model' }],
      object: 'list',
    });
    mockOpenAI({ listModels });
    const res = await request(createApp())
      .get('/v1/models')
      .set('Authorization', 'Bearer secret-gateway-key');
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run src/app.test.ts`
Expected: FAIL (404 on /v1/models)

- [ ] **Step 3: Implement `src/routes/models.ts`**

```ts
import { Router } from 'express';
import { asyncHandler } from '../middleware/error.js';
import { ApiError, mapOpenAIError } from '../../lib/errors.js';
import { runOpenAI } from '../../lib/openai.js';

export const modelsRouter = Router();

modelsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    try {
      const page = await runOpenAI((client) => client.models.list());
      res.json({ object: 'list', data: page.data });
    } catch (error) {
      console.error('OpenRouter models.list error:', error);
      const mapped = mapOpenAIError(error);
      throw new ApiError(mapped.status, mapped.code, mapped.message);
    }
  }),
);
```

- [ ] **Step 4: Implement `src/routes/embeddings.ts`**

```ts
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/error.js';
import { ApiError, mapOpenAIError } from '../../lib/errors.js';
import { runOpenAI } from '../../lib/openai.js';

const EmbeddingsBodySchema = z.object({
  model: z.string().min(1),
  input: z.union([z.string(), z.array(z.string()).min(1)]),
  dimensions: z.number().optional(),
  encoding_format: z.enum(['float', 'base64']).optional(),
  user: z.string().optional(),
});

export const embeddingsRouter = Router();

embeddingsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = EmbeddingsBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid embeddings request body.');
    }
    const body = parsed.data;
    try {
      const result = await runOpenAI((client) =>
        client.embeddings.create({
          model: body.model,
          input: body.input,
          dimensions: body.dimensions,
          encoding_format: body.encoding_format,
          user: body.user,
        }),
      );
      res.json(result);
    } catch (error) {
      console.error('OpenRouter embeddings.create error:', error);
      const mapped = mapOpenAIError(error);
      throw new ApiError(mapped.status, mapped.code, mapped.message);
    }
  }),
);
```

- [ ] **Step 5: Mount in `src/app.ts`**

Update `createApp` so `/v1` router includes:

```ts
import { modelsRouter } from './routes/models.js';
import { embeddingsRouter } from './routes/embeddings.js';

// inside createApp, after creating v1:
v1.use('/models', modelsRouter);
v1.use('/embeddings', embeddingsRouter);
```

Full `createApp` at this point:

```ts
import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/error.js';
import { requireApiKey } from './middleware/auth.js';
import { healthRouter } from './routes/health.js';
import { modelsRouter } from './routes/models.js';
import { embeddingsRouter } from './routes/embeddings.js';

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

  const v1 = express.Router();
  v1.use(requireApiKey);
  v1.use('/models', modelsRouter);
  v1.use('/embeddings', embeddingsRouter);
  app.use('/v1', v1);

  app.use(errorHandler);
  return app;
}
```

- [ ] **Step 6: Run tests — expect PASS**

Run: `npx vitest run src/app.test.ts src/middleware src/routes/health.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/routes/models.ts src/routes/embeddings.ts src/app.ts src/app.test.ts
git commit -m "feat: add models and embeddings Express routes"
```

---

### Task 4: Chat completions (JSON + SSE)

**Files:**
- Create: `src/routes/chat.ts`
- Modify: `src/app.ts` — `v1.use('/chat/completions', chatRouter)`
- Modify: `src/app.test.ts` — chat JSON, validation, stream, rate limit
- Test: `src/app.test.ts`

**Interfaces:**
- Consumes: `runOpenAI`, `runOpenAIHeld`, `mapOpenAIError`, `ApiError`
- Produces: `chatRouter` POST `/` with optional `stream: true` SSE

- [ ] **Step 1: Add failing chat tests to `src/app.test.ts`**

```ts
  it('POST /v1/chat/completions returns completion JSON', async () => {
    const createChat = vi.fn().mockResolvedValue({
      id: 'chatcmpl-1',
      choices: [{ message: { role: 'assistant', content: 'hello' } }],
    });
    mockOpenAI({ createChat });
    const res = await request(createApp())
      .post('/v1/chat/completions')
      .send({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'hi' }] });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('chatcmpl-1');
  });

  it('POST /v1/chat/completions with missing messages returns 400 VALIDATION_ERROR', async () => {
    mockOpenAI({});
    const res = await request(createApp())
      .post('/v1/chat/completions')
      .send({ model: 'gpt-4o-mini' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('POST /v1/chat/completions stream=true returns SSE chunks', async () => {
    const chunk = {
      id: 'chatcmpl-stream',
      object: 'chat.completion.chunk',
      choices: [{ index: 0, delta: { content: 'hi' }, finish_reason: null }],
    };
    const createChat = vi.fn().mockResolvedValue({
      controller: { abort: vi.fn() },
      async *[Symbol.asyncIterator]() {
        yield chunk;
      },
    });
    mockOpenAI({ createChat });

    const res = await request(createApp())
      .post('/v1/chat/completions')
      .send({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'hi' }],
        stream: true,
      })
      .buffer(true)
      .parse((res, cb) => {
        const data: Buffer[] = [];
        res.on('data', (chunk) => data.push(chunk));
        res.on('end', () => cb(null, Buffer.concat(data).toString('utf8')));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/event-stream');
    expect(res.body).toContain(`data: ${JSON.stringify(chunk)}`);
    expect(res.body).toContain('data: [DONE]');
    expect(createChat).toHaveBeenCalledWith(
      expect.objectContaining({ stream: true }),
      expect.objectContaining({ timeout: 120_000 }),
    );
  });

  it('maps OpenAI RateLimitError on chat to 429 RATE_LIMITED', async () => {
    const rateLimitError = new OpenAI.RateLimitError(
      429,
      { error: { message: 'Rate limited', type: 'rate_limit_error' } },
      'Rate limit exceeded',
      {} as ConstructorParameters<typeof OpenAI.RateLimitError>[3],
    );
    const createChat = vi.fn().mockRejectedValue(rateLimitError);
    mockOpenAI({ createChat });
    const res = await request(createApp())
      .post('/v1/chat/completions')
      .send({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'hi' }] });
    expect(res.status).toBe(429);
    expect(res.body.code).toBe('RATE_LIMITED');
  });
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run src/app.test.ts`
Expected: FAIL (404 on chat)

- [ ] **Step 3: Implement `src/routes/chat.ts`**

```ts
import { Router } from 'express';
import { z } from 'zod';
import type OpenAI from 'openai';
import { asyncHandler } from '../middleware/error.js';
import { ApiError, mapOpenAIError } from '../../lib/errors.js';
import { runOpenAI, runOpenAIHeld } from '../../lib/openai.js';

const STREAM_TIMEOUT_MS = 120_000;

const ChatCompletionBodySchema = z.object({
  model: z.string().min(1),
  messages: z.array(z.unknown()).min(1),
  stream: z.boolean().optional(),
  temperature: z.number().optional(),
  max_tokens: z.number().optional(),
  response_format: z.unknown().optional(),
  tools: z.unknown().optional(),
  tool_choice: z.unknown().optional(),
  top_p: z.number().optional(),
  presence_penalty: z.number().optional(),
  frequency_penalty: z.number().optional(),
  user: z.string().optional(),
});

type ChatBody = z.infer<typeof ChatCompletionBodySchema>;

function buildBaseParams(body: ChatBody) {
  return {
    model: body.model,
    messages: body.messages as OpenAI.Chat.ChatCompletionMessageParam[],
    temperature: body.temperature,
    max_tokens: body.max_tokens,
    response_format: body.response_format as
      | OpenAI.Chat.ChatCompletionCreateParamsNonStreaming['response_format']
      | undefined,
    tools: body.tools as
      | OpenAI.Chat.ChatCompletionCreateParamsNonStreaming['tools']
      | undefined,
    tool_choice: body.tool_choice as
      | OpenAI.Chat.ChatCompletionCreateParamsNonStreaming['tool_choice']
      | undefined,
    top_p: body.top_p,
    presence_penalty: body.presence_penalty,
    frequency_penalty: body.frequency_penalty,
    user: body.user,
  };
}

export const chatRouter = Router();

chatRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = ChatCompletionBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        'Invalid chat completion request body.',
      );
    }

    const body = parsed.data;
    const baseParams = buildBaseParams(body);

    try {
      if (body.stream === true) {
        await runOpenAIHeld(async (client, release) => {
          const stream = await client.chat.completions.create(
            { ...baseParams, stream: true },
            { timeout: STREAM_TIMEOUT_MS },
          );

          res.status(200);
          res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
          res.setHeader('Cache-Control', 'no-cache, no-transform');
          res.setHeader('Connection', 'keep-alive');
          res.setHeader('X-Accel-Buffering', 'no');

          const onClose = () => {
            stream.controller.abort();
            release();
          };
          res.on('close', onClose);

          try {
            for await (const chunk of stream) {
              if (res.writableEnded) break;
              res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            }
            if (!res.writableEnded) {
              res.write('data: [DONE]\n\n');
              res.end();
            }
          } finally {
            res.off('close', onClose);
            release();
          }
        });
        return;
      }

      const completion = await runOpenAI((client) =>
        client.chat.completions.create({
          ...baseParams,
          stream: false,
        }),
      );
      res.json(completion);
    } catch (error) {
      console.error('OpenRouter chat.completions error:', error);
      if (!res.headersSent) {
        const mapped = mapOpenAIError(error);
        throw new ApiError(mapped.status, mapped.code, mapped.message);
      }
      res.end();
    }
  }),
);
```

- [ ] **Step 4: Mount chat in `src/app.ts`**

```ts
import { chatRouter } from './routes/chat.js';
// ...
v1.use('/chat/completions', chatRouter);
```

- [ ] **Step 5: Run all tests — expect PASS**

Run: `npm test`
Expected: all PASS (including `lib/queue.test.ts`)

If SSE parse helper is awkward on Windows/supertest, alternative assertion:

```ts
const res = await request(createApp())
  .post('/v1/chat/completions')
  .responseType('text')
  .send({ ... stream: true });
```

Adjust until content-type and body assertions are stable.

- [ ] **Step 6: Commit**

```bash
git add src/routes/chat.ts src/app.ts src/app.test.ts
git commit -m "feat: add chat completions route with SSE streaming"
```

---

### Task 5: Remove Vercel artifacts + update docs + final verify

**Files:**
- Delete: `api/health.ts`, `api/v1/models.ts`, `api/v1/chat/completions.ts`, `api/v1/embeddings.ts`, `api/gateway.test.ts`, `vercel.json`, `lib/cors.ts`, `lib/request.ts`, empty `api/` dirs, `public/.gitkeep` if unused
- Modify: `README.md` — Express scripts, remove Vercel sections, local URL stays `localhost:3000`, structure tree for `src/`
- Modify: `.env.example` — add optional `PORT=3000`
- Modify: `.gitignore` — can keep `.vercel/` harmless or remove line
- Test: full suite + type-check

**Interfaces:** none new

- [ ] **Step 1: Delete Vercel / Fetch-only files**

Delete:

- `api/` (entire tree)
- `vercel.json`
- `lib/cors.ts`
- `lib/request.ts`

- [ ] **Step 2: Update `.env.example`**

```
OPENROUTER_API_KEY=your_key_here
# Optional attribution headers for openrouter.ai (shown in their dashboard/rankings).
# OPENROUTER_HTTP_REFERER=https://your-app.example.com
# OPENROUTER_APP_TITLE=Your App Name
# Optional shared secret for caller apps. Omit to disable gateway auth.
# API_KEY=your_gateway_secret
# PORT=3000
```

- [ ] **Step 3: Rewrite README for Express**

Key replacements:

- Title blurb: “HTTP-сервис-прокси к OpenRouter на Express” (not Vercel Functions)
- `npm run dev` → tsx watch; remove `deploy`
- Remove Vercel Project Settings / Framework Preset / Hobby limits paragraphs about Vercel body size
- Structure tree → `src/` layout from spec
- Keep curl examples and error table (URLs unchanged)
- Example fetch URL: `http://localhost:3000/...` (not `*.vercel.app`) — mention self-host base URL

- [ ] **Step 4: Run full verification**

Run:

```bash
npm test
npm run type-check
```

Expected: both succeed; no references to `vercel` in `package.json`.

Optional smoke (if `.env` has key):

```bash
npm run dev
# other terminal:
curl http://localhost:3000/health
```

Expected: `{"status":"ok"}`

- [ ] **Step 5: Grep for leftover Vercel / Web Response helpers**

Run: search repo for `vercel`, `apiErrorResponse`, `handleCorsPreflight`, `readJsonBody`

Expected: no matches in source (docs/history under `.planning/` may remain — leave those)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove Vercel and document Express gateway"
```

---

## Spec Coverage Self-Review

| Spec requirement | Task |
|------------------|------|
| Express + tsx, no Vercel | 1, 5 |
| `src/server.ts` / `src/app.ts` | 2 |
| Auth middleware | 2, 3 |
| Error shape + body-parser mapping | 1 |
| Health / models / embeddings / chat | 2–4 |
| SSE streaming + runOpenAIHeld | 4 |
| Supertest coverage | 2–4 |
| README + env PORT | 5 |
| Same public URLs | 2–4 mounts |

## Placeholder Scan

No TBD/TODO placeholders. SSE supertest parse note has a concrete fallback.

## Type Consistency

- `ApiError(status, code, message)` used by auth + routes + errorHandler
- `createApp(): Express` used by server + tests
- `requireApiKey` on `/v1` only
- `mapOpenAIError` → `throw new ApiError(...)` pattern everywhere
