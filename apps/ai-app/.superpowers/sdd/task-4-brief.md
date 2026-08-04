### Task 4: Chat completions (JSON + SSE)

**Files:**
- Create: `src/routes/chat.ts`
- Modify: `src/app.ts` вЂ” `v1.use('/chat/completions', chatRouter)`
- Modify: `src/app.test.ts` вЂ” chat JSON, validation, stream, rate limit
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

- [ ] **Step 2: Run вЂ” expect FAIL**

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

- [ ] **Step 5: Run all tests вЂ” expect PASS**

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
