### Task 3: Models + embeddings routes

**Files:**
- Create: `src/routes/models.ts`
- Create: `src/routes/embeddings.ts`
- Modify: `src/app.ts` вЂ” mount routers on `/v1`
- Modify: `src/app.test.ts` вЂ” models/embeddings/auth integration cases
- Test: `src/app.test.ts`

**Interfaces:**
- Consumes: `runOpenAI`, `mapOpenAIError`, `ApiError`, `asyncHandler`, `requireApiKey`
- Produces: `modelsRouter` with `GET /` в†’ mounted as `/v1/models`
- Produces: `embeddingsRouter` with `POST /` в†’ mounted as `/v1/embeddings`

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

- [ ] **Step 2: Run вЂ” expect FAIL**

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

- [ ] **Step 6: Run tests вЂ” expect PASS**

Run: `npx vitest run src/app.test.ts src/middleware src/routes/health.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/routes/models.ts src/routes/embeddings.ts src/app.ts src/app.test.ts
git commit -m "feat: add models and embeddings Express routes"
```

---
