<!-- generated-by: gsd-doc-writer -->
# Getting Started

Get **openrouter-gateway** running locally: an Express HTTP proxy to [OpenRouter](https://openrouter.ai) that keeps the upstream API key on the server.

## Prerequisites

- **Node.js** `>= 18` (project uses `@types/node` `^20` and ES2022 / `NodeNext` modules; Node 20 LTS recommended)
- **npm** (ships with Node.js; this repo uses `package-lock.json`)
- An **OpenRouter API key** from [openrouter.ai/keys](https://openrouter.ai/keys) for upstream chat, embeddings, and models calls
- Optional: `curl` or any HTTP client to verify endpoints

There is no `engines` field in `package.json` and no `.nvmrc` / `.node-version` pin.

## Installation steps

1. Clone the repository:

```bash
git clone https://github.com/MkinG2k0/ai-app.git
cd ai-app
```

2. Install dependencies:

```bash
npm install
```

3. Create a local env file from the example and set your OpenRouter key:

```bash
cp .env.example .env
```

Edit `.env` and replace `your_key_here` with a real key:

```bash
OPENROUTER_API_KEY=sk-or-...
```

Optional variables (`OPENROUTER_HTTP_REFERER`, `OPENROUTER_APP_TITLE`, `API_KEY`, `PORT`) are documented in [CONFIGURATION.md](CONFIGURATION.md).

## First run

Start the development server (loads `.env` via `tsx --env-file=.env` and watches for changes):

```bash
npm run dev
```

You should see:

```text
openrouter-gateway listening on http://0.0.0.0:3000
```

Confirm the process is up (no OpenRouter call required):

```bash
curl http://localhost:3000/health
```

Expected response: `{ "status": "ok" }`.

For a production-style start without auto-loading `.env`, export env vars in the shell (or your process manager), then run `npm start`.

## Common setup issues

| Problem | Cause | Fix |
|---------|--------|-----|
| Upstream routes fail with `OPENROUTER_API_KEY is not configured` | Missing or empty `OPENROUTER_API_KEY` | Set the key in `.env` for `npm run dev`, or export it in the environment for `npm start`. The HTTP server still starts without the key; only OpenRouter-backed routes fail when the client is built. |
| Port already in use / cannot bind | Another process is using `3000` | Set `PORT=3001` (or another free port) in `.env` or the process environment. |
| `401` / `UNAUTHORIZED` on `/v1/*` | `API_KEY` is set but the request lacks a matching credential | Send `Authorization: Bearer <API_KEY>` or `X-API-Key: <API_KEY>`. Omit `API_KEY` from `.env` to disable gateway auth. `GET /health` is never gated. |
| Env vars ignored with `npm start` | `start` is `tsx src/server.ts` and does **not** pass `--env-file` | Use `npm run dev` locally, or export variables before `npm start`. |

## Next steps

- [ARCHITECTURE.md](ARCHITECTURE.md) — system layout, request flow, and module boundaries
- [CONFIGURATION.md](CONFIGURATION.md) — full environment variable reference and defaults
- [DEVELOPMENT.md](DEVELOPMENT.md) — local development workflow, scripts, and conventions
- [TESTING.md](TESTING.md) — running and writing Vitest tests
- [API.md](API.md) — HTTP endpoints, auth, and error shapes
- [README.md](../README.md) — quick usage examples (`curl` for chat, embeddings, models)
