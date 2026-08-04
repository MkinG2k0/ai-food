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

If `--env-file` fails on older Node (<20.6), fall back to adding `dotenv` and `import 'dotenv/config'` in `server.ts` вЂ” prefer `--env-file` first.

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

- [ ] **Step 6: Run test вЂ” expect FAIL**

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

- [ ] **Step 9: Run test вЂ” expect PASS**

Run: `npx vitest run src/middleware/error.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts lib/errors.ts src/middleware/error.ts src/middleware/error.test.ts
git commit -m "feat: scaffold Express and rewrite error helpers"
```

---
