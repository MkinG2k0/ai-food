# External Integrations

**Analysis Date:** 2026-06-24

## APIs & External Services

**Food analysis (mock only):**
- Internal Express mock server — simulates AI nutrition analysis
  - Client: `axios` via `apps/mobile/src/shared/api/client.ts`
  - API wrapper: `apps/mobile/src/features/analyze-food/api/analyzeFoodApi.ts`
  - Endpoint: `POST /analyze-food` (`apps/backend/src/routes/analyze-food.ts`)
  - Auth: none
  - Behavior: accepts `multipart/form-data` field `image`, ignores file content, returns hardcoded `AnalyzeFoodResponse` after 1.5–3s delay
  - Base URL: `VITE_API_URL` env var or `http://localhost:3001`

**Real AI / vision APIs:**
- Not integrated — no OpenAI, Google Vision, Clarifai, or similar SDKs in dependencies or source

**Health check:**
- `GET /health` on backend (`apps/backend/src/index.ts`) — returns `{ status: 'ok' }`; not called from mobile app

## Data Storage

**Databases:**
- None — no ORM, no Prisma schema, no SQL/NoSQL client packages
- Backend explicitly stateless (`docs/superpowers/specs/2026-06-24-ai-food-mvp-design.md`, `apps/backend/src/routes/analyze-food.ts`)

**Client-side persistence:**
- Browser `localStorage` via Zustand `persist` middleware
  - Store key: `ai-food-diary` (`apps/mobile/src/entities/meal/model/useDiaryStore.ts`)
  - Data: `Meal[]` diary entries survive page reloads
  - Image preview state (`useImageStore`) is **not** persisted — in-memory only

**File Storage:**
- Upload path: in-memory only on backend (`multer.memoryStorage()` in `apps/backend/src/routes/analyze-food.ts`)
- No S3, Cloudinary, or filesystem persistence for images
- Frontend: `File` objects and `URL.createObjectURL` for previews (`apps/mobile/src/features/add-food/model/useImageStore.ts`)

**Caching:**
- TanStack Query in-memory cache for analyze-food responses (`apps/mobile/src/features/analyze-food/model/useAnalyzeFood.ts`, `apps/mobile/src/shared/lib/queryClient.ts`)
- No Redis or CDN caching layer

## Authentication & Identity

**Auth Provider:**
- None — MVP explicitly excludes auth (`docs/superpowers/specs/2026-06-24-ai-food-mvp-design.md` Non-Goals)
- No JWT, OAuth, session cookies, or API keys in mobile or backend code
- Backend CORS: `cors()` with default open settings (`apps/backend/src/index.ts`)
- Axios client has no request interceptor for auth headers (`apps/mobile/src/shared/api/client.ts`)

## Monitoring & Observability

**Error Tracking:**
- None — no Sentry, Datadog, or similar

**Logs:**
- Backend: `console.log` on startup (`apps/backend/src/index.ts`)
- Frontend: axios response interceptor maps errors to `ApiError` shape (`apps/mobile/src/shared/api/client.ts`); no structured logging framework
- User-facing errors: Sonner toasts (configured in `apps/mobile/src/app/providers.tsx`)

## CI/CD & Deployment

**Hosting:**
- Not configured — no Vercel, Netlify, Railway, Fly.io, or cloud manifests

**CI Pipeline:**
- Not detected — no `.github/workflows/`, GitLab CI, or similar

## Environment Configuration

**Required env vars:**

| Variable | App | Purpose | Default |
|----------|-----|---------|---------|
| `VITE_API_URL` | mobile | Backend base URL for axios | `http://localhost:3001` |
| `PORT` | backend | HTTP listen port | `3001` |

**Optional / not used:**
- No database connection strings
- No AI provider API keys
- No auth secrets

**Secrets location:**
- `.env` gitignored (`.gitignore`) — local developer config only
- No committed secrets files or `.env.example` template

## Webhooks & Callbacks

**Incoming:**
- None — only REST endpoints `/analyze-food` and `/health` on Express

**Outgoing:**
- None — backend does not call external services; mobile only calls the local/mock backend

## Integration Data Contracts

Shared types in `packages/shared-types/src/index.ts` define the mobile ↔ backend contract:

```typescript
// POST /analyze-food response
AnalyzeFoodResponse { result: NutritionResult; processingTime: number }
NutritionResult { foodName, calories, protein, carbs, fat, fiber, confidence }

// Error normalization (client-side)
ApiError { message, code, status }
```

Upload format: `FormData` with single field `image` (`apps/mobile/src/features/analyze-food/api/analyzeFoodApi.ts`).

## Browser / Device APIs

**File and camera (web APIs, not native plugins):**
- `HTMLInputElement` with `accept="image/*"` and `capture="environment"` for camera (`apps/mobile/src/features/add-food/ui/ImagePicker.tsx`)
- `URL.createObjectURL` / `revokeObjectURL` for image previews (mocked in Vitest setup: `apps/mobile/src/test/setup.ts`)

**Capacitor (planned, not integrated):**
- Referenced in design spec only; no `@capacitor/*` packages in workspace

## Future Integration Points (from design, not implemented)

Per `docs/superpowers/specs/2026-06-24-ai-food-mvp-design.md` non-goals and architecture notes:
- Real AI image recognition API
- User authentication / accounts
- Backend database persistence
- Payment processing
- `useDiary()` backend sync (currently reads Zustand store only)

---

*Integration audit: 2026-06-24*
