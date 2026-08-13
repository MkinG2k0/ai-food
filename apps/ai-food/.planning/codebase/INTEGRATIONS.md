# External Integrations

**Analysis Date:** 2026-08-03

## Sibling backend (AI Gateway)

**Path:** `apps/ai-app` (package `openrouter-gateway`)  
**Role:** Express → OpenRouter + food domain (`/v1/food/*`) + auth/quota/billing + **user-data sync**  
**Canonical agent doc:** `docs/AI-GATEWAY.md`

```
ai-food → VITE_AI_GATEWAY_* → ai-app /v1/* + /auth/* + /user/*/sync + /billing/* → OpenRouter / Postgres
```

### AI chat (primary)

- **Upstream:** OpenRouter (`OPENROUTER_API_KEY` server-side only)
- **Client env:** `VITE_AI_GATEWAY_URL`, `VITE_AI_GATEWAY_API_KEY`
- **Food routes:** `POST /v1/food/analyze|refine|ask` — prompts/model on server; client compress + parse
- **Generic:** `POST /v1/chat/completions` (e.g. onboarding micronutrients)
- **Auth headers:** Bearer / `X-API-Key`; usage: `X-Device-Id`, `X-Usage-Kind`, optional `X-User-Token`

### User data sync

- `PUT/GET` nutrition profile via auth (incl. optional `micronutrientTargets`)
- `POST /user/meals/sync`, `/user/weights/sync`, `/user/favorites/sync`, `/user/settings/sync` — LWW
- **Meal photo blobs are never uploaded** (permanent); only URI stubs on the wire
- Guests: Preferences only until login
- Details: `docs/USER-DATA-SYNC.md`

### Legacy / unused AI path

- `src/shared/api/client.ts` axios `VITE_API_URL` — not the main Gateway path
- Old in-repo Express mock `/analyze-food` — **removed**

## Data Storage

**Databases (ai-app / Postgres via Prisma):**
- `User` (incl. nutritionProfile, goalKg), `Meal`, `WeightEntry`, `Favorite`, usage/billing tables

**Client-side cache:**
- Capacitor Preferences via Zustand `persist` (diary, profile, settings, favorites, weight, auth)
- After login these stores are merged with server (except settings / micronutrientTargets — still local)

**File Storage:**
- Meal images: Capacitor Filesystem `meal-images/` — **device-local only, not synced**
- AI analyze uploads: base64 data URLs in request body (not persisted as account photos)

**Caching:**
- TanStack Query for async AI / usage calls

## Authentication & Identity

**User auth:** Telegram bot login / demo → `X-User-Token`  
**Gateway caller auth:** `VITE_AI_GATEWAY_API_KEY` ↔ `API_KEY` (tech debt: secret in client bundle)  
**Device:** `X-Device-Id` for guest quota

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

*Integration analysis: 2026-08-13*
