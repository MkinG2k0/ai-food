<!-- generated-by: gsd-doc-writer -->
# Configuration

Runtime configuration for **openrouter-gateway** is environment-variable based. There are no separate JSON/YAML/TOML config files. Copy `.env.example` to `.env` for local development; `npm run dev` loads that file via `tsx --env-file=.env`.

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENROUTER_API_KEY` | **Yes** (for upstream calls) | — | OpenRouter API key used by `getOpenAIClient()` in `lib/openai.ts`. Obtain from [openrouter.ai/keys](https://openrouter.ai/keys). |
| `OPENROUTER_HTTP_REFERER` | No | unset | Optional app attribution; sent as the `HTTP-Referer` header to OpenRouter when set. |
| `OPENROUTER_APP_TITLE` | No | unset | Optional app attribution; sent as the `X-Title` header to OpenRouter when set. |
| `API_KEY` | No | unset | Shared secret for caller apps. When unset or empty, gateway auth is disabled. When set, `/v1/*` requires `Authorization: Bearer <API_KEY>` or `X-API-Key: <API_KEY>`. |
| `PORT` | No | `3000` | HTTP listen port (`src/server.ts`). Server binds to `0.0.0.0`. |

Canonical list (with comments) lives in `.env.example`:

```bash
OPENROUTER_API_KEY=your_key_here
# Optional attribution headers for openrouter.ai (shown in their dashboard/rankings).
# OPENROUTER_HTTP_REFERER=https://your-app.example.com
# OPENROUTER_APP_TITLE=Your App Name
# Optional shared secret for caller apps. Omit to disable gateway auth.
# API_KEY=your_gateway_secret
# PORT=3000
```

## Config file format

This project does **not** use application config files (`config.json`, `config.yaml`, etc.). All tunable settings that are environment-driven are listed above.

Hardcoded runtime values (not env-configurable):

| Setting | Value | Location |
|---------|-------|----------|
| OpenRouter base URL | `https://openrouter.ai/api/v1` | `lib/openai.ts` |
| Upstream client timeout | `30_000` ms | `lib/openai.ts` |
| Upstream concurrency limit | `5` | `lib/queue.ts` (`OPENAI_CONCURRENCY`) |
| JSON body limit | `10mb` | `src/app.ts` |
| CORS | `origin: '*'`, methods `GET`/`POST`/`OPTIONS` | `src/app.ts` |

## Required vs optional settings

**Required for OpenRouter proxy calls**

- `OPENROUTER_API_KEY` — validated when `getOpenAIClient()` runs (first use of chat, embeddings, or models routes). Missing key throws:
  ```text
  OPENROUTER_API_KEY is not configured
  ```
- The HTTP server itself still starts without this key; only upstream-backed routes fail when the client is constructed.

**Optional**

- `API_KEY` — if absent, `requireApiKey` in `src/middleware/auth.ts` calls `next()` and leaves `/v1/*` open. `GET /health` is never gated by this middleware.
- `OPENROUTER_HTTP_REFERER` / `OPENROUTER_APP_TITLE` — added to the OpenAI SDK `defaultHeaders` only when present.
- `PORT` — falls back to `3000` when unset or non-numeric (`Number(process.env.PORT) || 3000`).

## Defaults

| Variable / setting | Default | Where set |
|--------------------|---------|-----------|
| `PORT` | `3000` | `src/server.ts` |
| Auth | disabled when `API_KEY` unset | `src/middleware/auth.ts` |
| Attribution headers | omitted when vars unset | `lib/openai.ts` |

## Per-environment overrides

- **Local development:** copy `.env.example` → `.env`, fill `OPENROUTER_API_KEY`, run `npm run dev`. The `dev` script loads `.env` via `tsx watch --env-file=.env`.
- **Production / `npm start`:** the `start` script is `tsx src/server.ts` and does **not** pass `--env-file`. Set variables in the process environment (shell export, process manager, or host secret store). <!-- VERIFY: production secret-store / platform env injection for this deployment -->
- There are no `.env.development`, `.env.production`, or `.env.test` files in the repository. Tests set `process.env` inline where needed (for example `OPENROUTER_API_KEY` / `API_KEY` in `src/app.test.ts`).
- `NODE_ENV` is not read by application code for configuration branching.
