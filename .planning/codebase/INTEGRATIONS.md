# External Integrations

**Analysis Date:** 2026-08-03

## Sibling backend (AI Gateway)

**Repo:** `d:\Project\Main\ai-app` (package `openrouter-gateway`)  
**Role:** Express OpenAI-compatible proxy to OpenRouter — not an in-repo backend and not food-domain API.  
**Canonical agent doc:** `docs/AI-GATEWAY.md`

```
ai-food → VITE_AI_GATEWAY_* → ai-app /v1/* → OpenRouter
```

### AI chat (primary)

- **Upstream:** OpenRouter via sibling gateway (`OPENROUTER_API_KEY` server-side only)
- **Client env:** `VITE_AI_GATEWAY_URL`, `VITE_AI_GATEWAY_API_KEY` (maps to gateway `API_KEY`)
- **Contract:** `POST /v1/chat/completions` (JSON + SSE `stream: true`); also `GET /v1/models`, `POST /v1/embeddings`, `GET /health`
- **Auth:** `Authorization: Bearer` or `X-API-Key` when gateway `API_KEY` is set
- **Call sites:**
  - `src/features/analyze-food/api/analyzeFoodApi.ts` (+ `streamChatCompletions.ts`)
  - `src/features/analyze-food/api/refineMealApi.ts`
  - `src/features/analyze-food/api/fetchMealCustomContentApi.ts`
  - `src/features/onboarding/api/micronutrientTargetsApi.ts`
- **Domain logic on client:** prompts, image compress, XML/JSON nutrition parse — not on gateway
- **Error codes from gateway:** `RATE_LIMITED`, `UPSTREAM_TIMEOUT`, `BAD_REQUEST`, `UPSTREAM_ERROR`, `UNAUTHORIZED`, `VALIDATION_ERROR` — mapped in client APIs

### Legacy / unused AI path

- `src/shared/api/client.ts` axios `VITE_API_URL` (default `http://localhost:3001`) — not the main AI Gateway path
- Old in-repo Express mock `/analyze-food` — **removed**; do not restore from stale planning notes

## Data Storage

**Databases:**
- None in ai-food or required by ai-app gateway (stateless proxy)

**Client-side persistence:**
- Capacitor Preferences / localStorage via Zustand `persist` (diary, profile, settings, favorites)
- Image selection store is ephemeral unless saved into a meal

**File Storage:**
- Meal images via Capacitor Filesystem where configured; AI uploads are base64 data URLs in chat messages (body limit on gateway: 10 MB)

**Caching:**
- TanStack Query for async AI calls
- OpenRouter prompt cache via block-level `cache_control` in analyze messages (gateway Zod must allow nested message content fields)

## Authentication & Identity

**User auth:** none in MVP (single device user)  
**Gateway auth:** shared secret `VITE_AI_GATEWAY_API_KEY` ↔ `API_KEY` (tech debt: secret shipped in client bundle)

## Monitoring & Observability

- No Sentry/Datadog
- Client: `console` + Sonner toasts where wired
- Gateway: `console.error` on upstream failures

## CI/CD & Deployment

- ai-food: static SPA / Capacitor; no CI manifests detected in-repo
- ai-app: deployable Node service (example prod URL may appear in local `.env` as `VITE_AI_GATEWAY_URL`)

## Environment Configuration

| Variable | App | Purpose |
|----------|-----|---------|
| `VITE_AI_GATEWAY_URL` | ai-food | Gateway base URL (no `/v1` suffix) |
| `VITE_AI_GATEWAY_API_KEY` | ai-food | Caller secret for gateway |
| `VITE_API_URL` | ai-food | Optional axios base (legacy) |
| `OPENROUTER_API_KEY` | ai-app | Upstream provider key |
| `API_KEY` | ai-app | Optional caller auth |
| `PORT` | ai-app | Listen port (default 3000) |
| `OPENROUTER_HTTP_REFERER` / `OPENROUTER_APP_TITLE` | ai-app | Optional OpenRouter attribution |

`.env` is gitignored in both repos; ai-app has `.env.example`.

## See also

- `docs/AI-GATEWAY.md` — full sibling-backend contract for agents
- `d:\Project\Main\ai-app\docs\ARCHITECTURE.md` — gateway architecture
- `d:\Project\Main\ai-app\docs\API.md` — gateway HTTP API

---

*Integration analysis: 2026-08-03*
