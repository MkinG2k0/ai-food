# Design: Migrate OpenRouter Gateway from Vercel to Express.js

Date: 2026-08-03  
Status: Approved

## Goal

Replace Vercel Functions hosting with a long-running Express.js Node server. Keep the public REST contract, OpenRouter proxy behavior, auth, CORS, error shape, and streaming semantics. Run TypeScript via `tsx` (no separate build step). Remove all Vercel artifacts.

## Decisions

| Topic | Choice |
|-------|--------|
| Runtime | Express.js on Node |
| TypeScript execution | `tsx` / `tsx watch` (no `tsc` emit for start) |
| Vercel | Fully remove (`vercel.json`, `vercel` dep, deploy script, docs mentions) |
| Public API | Unchanged paths and payloads |
| Structure | Classic Express app + routes + middleware |

## Architecture

One long-lived Express process.

```
src/
  server.ts              # PORT listen (default 3000)
  app.ts                 # express() + middleware + route mounts (testable without listen)
  middleware/
    auth.ts              # optional API_KEY (Bearer / X-API-Key)
    error.ts             # central handler → { message, code, status }
  routes/
    health.ts            # GET /health
    models.ts            # GET /v1/models
    chat.ts              # POST /v1/chat/completions
    embeddings.ts        # POST /v1/embeddings
lib/
  openai.ts              # OpenRouter client + concurrency limiter (keep)
  queue.ts               # keep
  errors.ts              # map upstream errors; Express-friendly helpers (no Web Response)
  types.ts               # ApiError (keep)
```

**To remove (migration cleanup — may still exist until cleanup lands)**

- `api/**` (Vercel fetch handlers; still present until deleted)
- `vercel.json`
- `lib/cors.ts` (replaced by `cors` middleware; still present until deleted)
- `lib/request.ts` (replaced by `express.json({ limit: '10mb' })`; still present until deleted)
- dependency `vercel`, scripts `dev`/`deploy` tied to Vercel

**Scripts**

| Script | Command |
|--------|---------|
| `dev` | `tsx watch --env-file=.env src/server.ts` |
| `start` | `tsx src/server.ts` |
| `test` | `vitest run` |
| `type-check` | `tsc --noEmit` |

## Middleware

1. **CORS** — `Access-Control-Allow-Origin: *`; methods `GET, POST, OPTIONS`; headers `Content-Type, Authorization, X-API-Key`.
2. **JSON body** — `express.json({ limit: '10mb' })`. Oversized body and invalid JSON are mapped in the error middleware to `413 PAYLOAD_TOO_LARGE` and `400 VALIDATION_ERROR` respectively (gateway `{ message, code, status }` shape).
3. **Auth** — `requireApiKey` on `/v1/*` only. `/health` is open. If `API_KEY` is unset, auth is disabled. Otherwise require `Authorization: Bearer <API_KEY>` or `X-API-Key: <API_KEY>`; else `401 UNAUTHORIZED`.
4. **Error handler** — all gateway errors as `{ message, code, status }`.

## Routes (behavior parity)

### `GET /health`

`{ "status": "ok" }` — no auth.

### `GET /v1/models`

Proxy `client.models.list()` → `{ object: "list", data: [...] }`.

### `POST /v1/chat/completions`

Zod schema unchanged: required `model`, `messages`; optional `stream`, `temperature`, `max_tokens`, `response_format`, `tools`, `tool_choice`, `top_p`, `presence_penalty`, `frequency_penalty`, `user`.

- Non-stream: JSON completion body.
- Stream (`stream: true`): `Content-Type: text/event-stream`, OpenAI-compatible SSE chunks (`data: {...}\n\n`, final `data: [DONE]`). Concurrency slot held until stream ends or client disconnect (`runOpenAIHeld`). Stream timeout 120s; non-stream uses client default 30s.

### `POST /v1/embeddings`

Zod schema unchanged: required `model`, `input`; optional `dimensions`, `encoding_format`, `user`.

## Error codes (unchanged)

| Code | HTTP | When |
|------|------|------|
| `UNAUTHORIZED` | 401 | Missing/invalid API key |
| `VALIDATION_ERROR` | 400 | Invalid body / invalid JSON |
| `PAYLOAD_TOO_LARGE` | 413 | Body > 10 MB |
| `RATE_LIMITED` | 429 | OpenRouter rate limit |
| `BAD_REQUEST` | 400 | Upstream rejected request |
| `UPSTREAM_TIMEOUT` | 504 | Upstream timeout |
| `UPSTREAM_ERROR` | 500 | Other upstream failure |

`lib/openai.ts` and `lib/queue.ts` stay; only response helpers move off Web `Response`.

## Environment

| Variable | Required | Notes |
|----------|----------|-------|
| `OPENROUTER_API_KEY` | yes | OpenRouter key |
| `OPENROUTER_HTTP_REFERER` | no | Attribution |
| `OPENROUTER_APP_TITLE` | no | Attribution |
| `API_KEY` | no | Caller auth; omit to disable |
| `PORT` | no | Default `3000` |

## Dependencies

**Add:** `express`, `cors`, `tsx`, `@types/express`, `@types/cors`, `supertest`, `@types/supertest`  
**Remove:** `vercel`  
**Keep:** `openai`, `zod`, `vitest`, `typescript`, `@types/node`

Update `tsconfig.json` `include` to `src`, `lib` (drop `api`).

## Testing

- Replace `api/gateway.test.ts` with Express app tests via `supertest` against `app` (no listen).
- Keep OpenAI SDK mocks.
- Cover: health, models, chat JSON + validation, embeddings, auth 401, mapped upstream errors.
- Streaming: smoke test (SSE content-type / chunk presence), not fragile full parse.

## Out of scope

- Docker / PM2 / systemd
- Gateway-side rate limiting
- CORS origin whitelist
- New OpenAI API endpoints
- Provider change (remain on OpenRouter)

## Success criteria

1. `npm run dev` serves on `http://localhost:3000`.
2. Existing README curl examples work against Express (URLs unchanged).
3. `npm test` and `npm run type-check` pass.
4. No Vercel config, dependency, or deploy path remains.
5. Public API contract and error shape match pre-migration behavior.
