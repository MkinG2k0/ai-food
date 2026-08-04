# Stack Research

**Domain:** OpenAI Vision integration for food photo nutrition analysis (brownfield React + Express monorepo)
**Researched:** 2026-06-24
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| `openai` (official Node SDK) | **^6.44.0** | Server-side OpenAI API client (vision + structured JSON) | Official TypeScript SDK from `openai/openai-node`; zero runtime deps; native `fetch`; typed `chat.completions` and `responses` APIs. 26M+ weekly npm downloads. Required because API key must stay on backend. | **HIGH** — npm registry + GitHub releases verified 2026-06-17 |
| `gpt-4o-mini` | snapshot alias `gpt-4o-mini` | Vision model for food photo → KБЖУ | Cheapest multimodal model with vision + Structured Outputs support. Sufficient for single-plate food photos; ~15× cheaper input than `gpt-4o` / `gpt-5.x` tier. Override via `OPENAI_MODEL` env when accuracy insufficient. | **HIGH** — [OpenAI model docs](https://developers.openai.com/api/docs/models/gpt-4o-mini) |
| Chat Completions API | `v1/chat/completions` | Image-in → structured JSON-out | Single request with `image_url` (base64 data URL) + `response_format: { type: "json_schema", strict: true }`. Maps directly to existing `NutritionResult` type. Simpler than Responses API for one-shot analysis in Express route handler. | **HIGH** — Context7 `/websites/developers_openai_api` |
| `multer` (keep) | **^1.4.5-lts.2** | Multipart upload `image` field | Already wired in `analyze-food.ts` with `memoryStorage()`. Standard Express pattern; buffer available as `req.file.buffer` for base64 encoding. No disk writes (privacy, serverless-friendly). | **HIGH** — existing codebase + Context7 `/expressjs/multer` |
| Node.js | **>= 20.9.0** (bump from `>=18`) | Backend runtime | `openai@6.x` requires Node 20 LTS minimum per official migration guide. `sharp@0.35.x` also requires Node >= 20.9.0. | **HIGH** — openai-node MIGRATION.md |

### Supporting Libraries

| Library | Version | Purpose | When to Use | Confidence |
|---------|---------|---------|-------------|------------|
| `sharp` | **^0.35.2** | Resize, auto-orient, re-encode images before OpenAI call | When phone photos exceed ~2048px or HEIC/rotation issues appear. Reduces vision token cost and latency. Process `req.file.buffer` → JPEG/WebP ≤ 1536px long edge. | **HIGH** — npm + sharp.pixelplumbing.com |
| `dotenv` | **^17.4.2** | Load `.env` in local dev | When `tsx watch` / `node dist/index.js` cannot use `node --env-file`. Import `dotenv/config` as first line in `apps/backend/src/index.ts`. Alternative: native `node --env-file=.env` in `start` script (Node 20.6+). | **MEDIUM** — optional if using native `--env-file` |
| `zod` | **^3.24.x** | Runtime validation of AI JSON before responding | After parsing `message.content` JSON, validate against schema mirroring `NutritionResult`. Catches malformed AI output before it reaches React. | **MEDIUM** — ecosystem standard; not yet in repo |

### Frontend — No New AI Dependencies

| Keep As-Is | Version | Role | Confidence |
|------------|---------|------|------------|
| `axios` | ^1.18.1 | `POST /analyze-food` multipart | Client never touches OpenAI. Existing `analyzeFoodApi` + 30s timeout is adequate for vision latency. | **HIGH** |
| `@tanstack/react-query` | ^5.101.1 | `useAnalyzeFood` server state | Retry/error UX already wired. Increase timeout only if backend consistently exceeds 30s. | **HIGH** |
| Browser `FormData` + `<input type="file">` | — | Image capture | Web-first MVP; no Capacitor/camera plugin needed this cycle. | **HIGH** |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `.env.example` | Document required vars without secrets | Add `OPENAI_API_KEY`, `OPENAI_MODEL`, `PORT`, `CORS_ORIGIN`. Never commit `.env`. |
| `tsx` (keep) | Backend dev watcher | Already in `apps/backend`. |
| MSW or route-level mock toggle | Test frontend without OpenAI spend | Optional `ANALYZE_FOOD_MOCK=true` env for CI/local UI work. |

## Environment Configuration

### Backend-only secrets (never in `VITE_*`)

```bash
# apps/backend/.env (local) — or repo-root .env loaded by backend entry
OPENAI_API_KEY=sk-...          # Required in prod; fail fast at startup if missing
OPENAI_MODEL=gpt-4o-mini       # Override: gpt-4o, gpt-5.4-mini for higher accuracy
PORT=3001
CORS_ORIGIN=http://localhost:5173  # Prod: https://your-app.vercel.app
```

### Frontend (public)

```bash
# apps/mobile/.env
VITE_API_URL=http://localhost:3001   # Prod: https://api.your-domain.com
```

**Rule:** `VITE_` prefix exposes values to browser bundle. OpenAI key must never use `VITE_`.

### Loading strategy

| Environment | Approach |
|-------------|----------|
| Local dev (`pnpm dev`) | `import 'dotenv/config'` first in backend entry **or** `node --env-file=apps/backend/.env` in start script |
| Production (Render/Railway/Fly) | Platform env vars injected at runtime; no `.env` file on disk |
| CI | Mock mode or test API key in secrets store |

## Installation

```bash
# From repo root — backend AI stack only
pnpm --filter @ai-food/backend add openai@^6.44.0 sharp@^0.35.2

# Optional
pnpm --filter @ai-food/backend add zod@^3.24.0
pnpm --filter @ai-food/backend add dotenv@^17.4.2

# Bump root engines (recommended)
# package.json: "node": ">=20.9.0"
```

## Integration Pattern (Prescriptive)

```
Browser                Express backend              OpenAI API
───────                ───────────────              ──────────
File (FormData)  →  multer.memoryStorage()
                    sharp (resize/orient)    →  optional
                    buffer → base64 data URL
                    openai.chat.completions.create({
                      model: OPENAI_MODEL,
                      messages: [{ role: 'user', content: [
                        { type: 'text', text: NUTRITION_PROMPT },
                        { type: 'image_url', image_url: {
                            url: `data:image/jpeg;base64,...`,
                            detail: 'high'   // 'low' for cost savings
                        }}
                      ]}],
                      response_format: { type: 'json_schema', json_schema: { ... } }
                    })
                    validate → NutritionResult     ←  gpt-4o-mini vision
               ←  AnalyzeFoodResponse JSON
```

**Prompt contract:** System/user prompt must ask for `foodName`, `calories`, `protein`, `carbs`, `fat`, `fiber`, `confidence` (0–1). JSON schema `strict: true` + `additionalProperties: false` aligns with OpenAI Structured Outputs requirements.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `openai` official SDK | Vercel AI SDK (`ai` + `@ai-sdk/openai`) | Next.js app with streaming UI, tool calling, or React Server Components. Overkill for single Express proxy endpoint. |
| Chat Completions API | Responses API (`openai.responses.create`) | New greenfield agents, multi-turn reasoning, or when OpenAI deprecates Chat Completions. Migrate later; both support vision + json_schema in 2026. |
| `gpt-4o-mini` | `gpt-4o` / `gpt-5.4-mini` | Complex multi-item meals, poor lighting, or user reports systematic underestimation of portions. |
| `sharp` server-side resize | Client canvas resize before upload | Reduce backend CPU on serverless; acceptable MVP shortcut if skipping `sharp` initially. |
| `multer` memory | OpenAI Files API (`purpose: "vision"`) | Very large images or repeated analysis of same file. Adds upload round-trip; unnecessary for single-shot food photos. |
| `dotenv` | Node native `--env-file` / `process.loadEnvFile()` | Node 20.6+ only; zero-deps local dev. Prefer if team standardizes on Node 22+. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| OpenAI API key in React (`VITE_OPENAI_*`) | Exposed in browser bundle; abusable, billable by anyone | Backend proxy (`apps/backend`) |
| Raw `fetch('https://api.openai.com/...')` from frontend | Same security issue; no central error handling | Express route + official SDK |
| `gpt-4-vision-preview` / `gpt-4-turbo` vision snapshots | Deprecated legacy models | `gpt-4o-mini` or current `gpt-4o` |
| Unstructured text + regex/JSON.parse | Fragile; model may wrap JSON in markdown | `response_format: json_schema` with `strict: true` |
| `multer.diskStorage()` for food photos | Disk I/O, cleanup, GDPR-ish concerns for MVP | `memoryStorage()` (already in place) |
| Storing uploaded images in DB/S3 for MVP | Out of scope; adds cost and privacy surface | Process in memory, discard after analysis |
| `@google/generative-ai` / Claude SDK alongside OpenAI | Scope creep; PROJECT.md locks OpenAI Vision | Single provider until MVP ships |
| `openai` SDK in `apps/mobile` | Violates security constraint; bloats bundle | Keep AI logic in `apps/backend` only |
| HEIC upload without conversion | OpenAI accepts PNG/JPEG/WebP/GIF only | `sharp` converts to JPEG before API call |
| Default `detail: 'original'` on gpt-4o family | `original` is for gpt-5.4+ patch-based models | `detail: 'high'` or `'low'` for gpt-4o-mini |

## Stack Patterns by Variant

**If skipping `sharp` in first PR:**
- Add `multer` limits: `fileSize: 10 * 1024 * 1024`, image MIME filter (`image/jpeg`, `image/png`, `image/webp`)
- Accept that 12MP phone photos cost more tokens and run slower
- Add `sharp` in follow-up phase when cost/latency matters

**If analysis quality is poor:**
- Bump `OPENAI_MODEL` to `gpt-4o`
- Set `detail: 'high'`
- Improve prompt with portion-size hints ("estimate for visible plate, state assumptions")

**If deploying backend separately from Vite SPA:**
- Set `CORS_ORIGIN` to production frontend URL (replace `cors()` wide open)
- Set `VITE_API_URL` at mobile build time
- Ensure `OPENAI_API_KEY` in host env (Render/Railway/Fly secrets)
- Consider 60s request timeout on axios for cold starts + vision latency

**If CI must not call OpenAI:**
- `ANALYZE_FOOD_MOCK=true` returns existing hardcoded `MOCK_RESPONSE`
- Or MSW in Vitest for frontend-only tests

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `openai@6.44.0` | Node.js >= 20 LTS | SDK v6 dropped Node 18; bump `engines` in root `package.json` |
| `openai@6.44.0` | TypeScript >= 4.9 | Backend uses TS 5.5+; no conflict |
| `sharp@0.35.2` | Node.js >= 20.9.0 | Native libvips binary; use `pnpm` on same OS as deploy target |
| `multer@1.4.5-lts.2` | `express@4.x` | Already paired in project |
| `openai@6.x` + CommonJS backend | `tsc` → `dist/` | SDK is ESM-friendly; works with `tsx` dev and CJS compile via dynamic import if needed |
| `gpt-4o-mini` + `json_schema` strict | `NutritionResult` 7 fields | All fields must be in schema `required`; use `confidence` as `number` 0–1 |

## Deployment Considerations

| Concern | MVP approach |
|---------|--------------|
| Secrets | `OPENAI_API_KEY` via platform env; rotate if leaked |
| Frontend hosting | Vite static build → Vercel/Netlify/Cloudflare Pages |
| Backend hosting | Render/Railway/Fly single Node process; no DB needed |
| Cold start | First vision call may take 5–15s; show existing Skeleton UI |
| Rate limits | OpenAI tier limits; return 429 with friendly `ApiError` message |
| Cost control | Default `gpt-4o-mini` + `detail: 'low'` optional; log token usage via `completion.usage` |
| Health check | Keep `GET /health`; add startup check that `OPENAI_API_KEY` is set when mock disabled |

## Sources

- Context7 `/websites/developers_openai_api` — vision input (base64 `image_url`), Structured Outputs `json_schema`, Chat Completions examples (**HIGH**)
- Context7 `/expressjs/multer` — `memoryStorage`, limits, file filters (**HIGH**)
- [OpenAI Images and Vision guide](https://platform.openai.com/docs/guides/images-vision) — supported formats, detail levels, sizing behavior (**HIGH**)
- [OpenAI Models page](https://platform.openai.com/docs/models) — gpt-4o-mini, gpt-5.4-mini pricing tiers (**HIGH**)
- [npm openai@6.44.0](https://www.npmjs.com/package/openai) — current SDK version (**HIGH**)
- [openai-node MIGRATION.md](https://github.com/openai/openai-node/blob/master/MIGRATION.md) — Node 20 requirement (**HIGH**)
- [npm sharp@0.35.2](https://www.npmjs.com/package/sharp) — image preprocessing (**HIGH**)
- [npm dotenv@17.4.2](https://www.npmjs.com/package/dotenv) — env loading (**MEDIUM**)
- Existing codebase: `.planning/codebase/STACK.md`, `apps/backend/src/routes/analyze-food.ts`, `packages/shared-types` (**HIGH**)

---
*Stack research for: AI Food — OpenAI Vision integration layer*
*Researched: 2026-06-24*
