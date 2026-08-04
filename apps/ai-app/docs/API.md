<!-- generated-by: gsd-doc-writer -->
# API

OpenAI-compatible HTTP API exposed by **openrouter-gateway**. Default listen address is `http://0.0.0.0:3000` (`PORT` env, default `3000`). <!-- VERIFY: production base URL -->

## Authentication

Gateway auth is optional and controlled by the `API_KEY` environment variable (`src/middleware/auth.ts`).

| Condition | Behavior |
|-----------|----------|
| `API_KEY` unset | All routes accept requests without credentials (including `/v1/*`). |
| `API_KEY` set | Every `/v1/*` route requires a matching key. `GET /health` remains open. |

When `API_KEY` is set, send the key in either header (first match wins: Bearer, then `X-API-Key`):

```http
Authorization: Bearer <API_KEY>
```

```http
X-API-Key: <API_KEY>
```

CORS allows `Content-Type`, `Authorization`, and `X-API-Key` (`src/app.ts`).

Missing or wrong credentials return:

```json
{
  "message": "Valid API key required.",
  "code": "UNAUTHORIZED",
  "status": 401
}
```

Upstream OpenRouter access uses `OPENROUTER_API_KEY` on the server; clients never send that key to this gateway.

## Endpoints overview

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| `GET` | `/health` | Liveness check; does not call OpenRouter | No |
| `GET` | `/v1/models` | List models from OpenRouter | If `API_KEY` set |
| `POST` | `/v1/embeddings` | Create embeddings via OpenRouter | If `API_KEY` set |
| `POST` | `/v1/chat/completions` | Chat completions (JSON or SSE stream) | If `API_KEY` set |

Unknown paths return `404` `NOT_FOUND` (`Route not found.`).

JSON request bodies are limited to **10 MB** (`express.json({ limit: '10mb' })`).

## Request/response formats

### Error envelope

All structured errors use this JSON body (`lib/types.ts` / `sendApiError`):

```json
{
  "message": "Human-readable description.",
  "code": "ERROR_CODE",
  "status": 400
}
```

### `GET /health`

No body. Response:

```json
{
  "status": "ok"
}
```

### `GET /v1/models`

No request body. Success response:

```json
{
  "object": "list",
  "data": [ /* OpenRouter model objects from the SDK list page */ ]
}
```

### `POST /v1/embeddings`

Validated with Zod (`src/routes/embeddings.ts`):

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `model` | string (min length 1) | Yes | |
| `input` | string or non-empty string array | Yes | |
| `dimensions` | number | No | |
| `encoding_format` | `"float"` \| `"base64"` | No | |
| `user` | string | No | |

Example request:

```json
{
  "model": "text-embedding-3-small",
  "input": "hello world"
}
```

Success: OpenAI SDK embeddings create result as JSON (passed through from OpenRouter).

Invalid body → `400` `VALIDATION_ERROR` (`Invalid embeddings request body.`).

### `POST /v1/chat/completions`

Validated with Zod (`src/routes/chat.ts`):

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `model` | string (min length 1) | Yes | |
| `messages` | non-empty array | Yes | Elements not deeply validated; forwarded as chat messages |
| `stream` | boolean | No | `true` enables SSE |
| `temperature` | number | No | |
| `max_tokens` | number | No | |
| `response_format` | unknown | No | Forwarded to upstream |
| `tools` | unknown | No | Forwarded to upstream |
| `tool_choice` | unknown | No | Forwarded to upstream |
| `top_p` | number | No | |
| `presence_penalty` | number | No | |
| `frequency_penalty` | number | No | |
| `user` | string | No | |

**Non-streaming** (`stream` omitted or `false`): success body is the OpenAI chat completion JSON object from OpenRouter.

Example:

```json
{
  "model": "openai/gpt-4o-mini",
  "messages": [
    { "role": "user", "content": "Hello" }
  ]
}
```

**Streaming** (`stream: true`): response is `text/event-stream` with headers `Cache-Control: no-cache, no-transform`, `Connection: keep-alive`, `X-Accel-Buffering: no`. Each chunk is:

```text
data: <ChatCompletionChunk JSON>

```

Stream ends with:

```text
data: [DONE]

```

Upstream create timeout for streaming is **120 seconds**. Client disconnect aborts the upstream stream and releases the concurrency slot.

Invalid body → `400` `VALIDATION_ERROR` (`Invalid chat completion request body.`).

## Error codes

| HTTP status | Code | When |
|-------------|------|------|
| `400` | `VALIDATION_ERROR` | Zod validation failed; or invalid JSON body (`Invalid JSON body.`) |
| `400` | `BAD_REQUEST` | Upstream `OpenAI.BadRequestError` |
| `401` | `UNAUTHORIZED` | `API_KEY` set and missing/wrong credential |
| `404` | `NOT_FOUND` | No matching route |
| `413` | `PAYLOAD_TOO_LARGE` | Body exceeds 10 MB |
| `429` | `RATE_LIMITED` | Upstream `OpenAI.RateLimitError` |
| `500` | `UPSTREAM_ERROR` | Unmapped upstream/SDK failure or unhandled server error |
| `504` | `UPSTREAM_TIMEOUT` | Upstream `OpenAI.APIConnectionTimeoutError` |

Upstream mapping is implemented in `mapOpenAIError` (`lib/errors.ts`). Central handling is in `errorHandler` (`src/middleware/error.ts`).

## Rate limits

There is **no** per-client HTTP rate limiter (no `express-rate-limit` or similar) in this gateway.

Behavior that affects throughput:

- **Upstream OpenRouter limits** — SDK `RateLimitError` is mapped to `429` `RATE_LIMITED` with message `OpenRouter rate limit exceeded. Please try again later.`
- **In-process concurrency** — OpenRouter calls share a FIFO limiter with concurrency **5** (`lib/queue.ts` via `lib/openai.ts`). Excess requests wait; they are not dropped.

<!-- VERIFY: OpenRouter account-level rate limits and quotas -->
