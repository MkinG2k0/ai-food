# Architecture Research

**Domain:** AI food nutrition tracking — OpenAI Vision integration in React FSD + Express monorepo
**Researched:** 2026-06-24
**Confidence:** HIGH (existing codebase verified; OpenAI patterns from official docs via Context7)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CLIENT (apps/mobile, FSD)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  pages/          widgets/           features/              entities/         │
│  ┌──────────┐   ┌─────────────┐   ┌──────────────┐       ┌──────────────┐  │
│  │ResultPage│──▶│NutritionCard│◀──│ analyze-food │       │ meal         │  │
│  │AddFood   │──▶│DailyHeader  │   │ add-food     │──────▶│ useDiaryStore│  │
│  │Home/Diary│   │MealList     │   │ save-meal    │       │ (persist)    │  │
│  └────┬─────┘   └─────────────┘   └──────┬───────┘       └──────┬───────┘  │
│       │                                    │                       │          │
│       │         TanStack Query             │ FormData POST         │ localStorage
│       │         (server state)             │                       │ ai-food-diary
├───────┴────────────────────────────────────┴───────────────────────┴──────────┤
│                         shared/api (Axios client + ApiError interceptor)       │
└───────────────────────────────────────┬─────────────────────────────────────┘
                                        │ HTTP multipart/form-data
                                        │ POST /analyze-food  { image: File }
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BACKEND PROXY (apps/backend)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  routes/analyze-food.ts  ──▶  services/analyze-food.service.ts             │
│       (multer, validate)           │                                         │
│                                    ├── openai-client.ts (SDK singleton)      │
│                                    ├── prompts/nutrition.ts (system prompt)  │
│                                    └── parse-nutrition.ts (JSON → domain)    │
├─────────────────────────────────────────────────────────────────────────────┤
│  Response: AnalyzeFoodResponse { result: NutritionResult, processingTime }   │
│  Errors:   { message, code, status } → mapped to ApiError on client          │
└───────────────────────────────────────┬─────────────────────────────────────┘
                                        │ HTTPS (server-side only)
                                        │ OPENAI_API_KEY from env
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         OpenAI API (external)                                │
│  chat.completions / responses API + vision input (base64 image_url)          │
│  response_format: json_schema (strict) → NutritionResult fields              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                    packages/shared-types (contract boundary)                 │
│  NutritionResult, AnalyzeFoodResponse, ApiError, Meal, FoodItem              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `features/add-food` | Ephemeral image capture; `File` + preview URL in Zustand | `useImageStore`, `ImagePicker` — **no change for AI** |
| `features/analyze-food` | Server state for analysis; POST image to backend | `analyzeFoodApi` + `useAnalyzeFood` (TanStack Query) — **contract unchanged** |
| `features/save-meal` | Map `NutritionResult` → `Meal`, persist, navigate | `useSaveMeal` — **no OpenAI awareness** |
| `entities/meal` | Diary domain + localStorage persistence | `useDiaryStore` with Zustand `persist` — **already wired** |
| `shared/api` | HTTP transport, timeout, error normalization | Axios + response interceptor → `ApiError` |
| `apps/backend/routes` | HTTP boundary: multer upload, status codes, call service | Thin route handler; no OpenAI imports in route file ideally |
| `apps/backend/services` | OpenAI call, prompt assembly, response parse/validate | `analyze-food.service.ts`, `openai-client.ts` |
| `packages/shared-types` | Mobile ↔ backend contract | Extend `ApiError.code` enum if needed; keep `AnalyzeFoodResponse` stable |

## Recommended Project Structure

```
ai-food/
├── packages/shared-types/src/
│   └── index.ts                    # Contract: NutritionResult, ApiError codes
├── apps/backend/src/
│   ├── index.ts                    # Express bootstrap, global error middleware
│   ├── routes/
│   │   └── analyze-food.ts         # multer → service → JSON response
│   ├── services/
│   │   ├── openai-client.ts        # OpenAI SDK singleton (reads OPENAI_API_KEY)
│   │   ├── analyze-food.service.ts # Orchestrates vision call + timing
│   │   └── nutrition-schema.ts     # JSON schema mirroring NutritionResult
│   ├── prompts/
│   │   └── nutrition.ts            # System + user prompt templates
│   └── lib/
│       ├── errors.ts               # AppError → HTTP status + ApiError shape
│       └── parse-nutrition.ts      # Safe JSON parse + field coercion
└── apps/mobile/src/
    ├── features/analyze-food/
    │   ├── api/analyzeFoodApi.ts   # Unchanged FormData POST
    │   └── model/useAnalyzeFood.ts # Query hook; optional timeout bump
    ├── features/save-meal/         # Unchanged
    ├── entities/meal/
    │   └── model/useDiaryStore.ts  # persist middleware (localStorage)
    └── shared/api/client.ts        # ApiError interceptor; optional toast helper
```

### Structure Rationale

- **`services/` on backend:** Isolates OpenAI SDK, prompts, and parsing from Express routing. Route stays a thin adapter — easy to test service without HTTP.
- **`prompts/` separate from service:** Prompt iteration is the highest-churn artifact during AI tuning; keep it out of business logic.
- **`nutrition-schema.ts` shared concept with `NutritionResult`:** JSON schema for OpenAI structured output must mirror `packages/shared-types` fields — single source of truth for field names.
- **No new frontend slice for AI:** FSD rule — analysis is already `features/analyze-food`. OpenAI is a backend concern; frontend continues POST → Query hook pattern.
- **No `shared-types` OpenAI types:** External API types stay server-private; only domain `NutritionResult` crosses the boundary.

## Architectural Patterns

### Pattern 1: Backend Proxy (BFF for Vision)

**What:** Mobile never calls OpenAI directly. Express receives multipart image, converts buffer to base64, calls OpenAI with server-held API key, returns domain-shaped JSON.

**When to use:** Always — required by project security constraint and enables future rate limiting/logging without client changes.

**Trade-offs:**
- (+) API key never in Vite bundle; CORS stays simple
- (+) Existing `AnalyzeFoodResponse` contract preserved — minimal frontend diff
- (+) Can swap model/provider without redeploying mobile
- (−) Extra network hop and backend hosting requirement
- (−) Backend becomes latency bottleneck; needs timeout alignment with client (30s axios timeout already set)

**Example:**
```typescript
// apps/backend/src/services/analyze-food.service.ts
export async function analyzeFoodImage(buffer: Buffer, mimeType: string): Promise<AnalyzeFoodResponse> {
  const started = Date.now();
  const base64 = buffer.toString('base64');
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_VISION_MODEL ?? 'gpt-4o',
    messages: [
      { role: 'system', content: NUTRITION_SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: NUTRITION_USER_PROMPT },
          { type: 'image_url', image_url: { url: dataUrl, detail: 'low' } },
        ],
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'nutrition_result', strict: true, schema: NUTRITION_JSON_SCHEMA },
    },
  });

  const raw = completion.choices[0]?.message?.content;
  const result = parseNutritionResult(raw); // → NutritionResult
  return { result, processingTime: Date.now() - started };
}
```

*Source: OpenAI Vision guides (base64 `image_url`, structured `json_schema`) — HIGH confidence via Context7 `/websites/developers_openai_api`.*

### Pattern 2: Structured Output Contract (JSON Schema → Domain Type)

**What:** Use OpenAI `response_format: { type: 'json_schema', strict: true }` so the model returns parseable JSON matching `NutritionResult` fields (`foodName`, `calories`, `protein`, `carbs`, `fat`, `fiber`, `confidence`).

**When to use:** Always for nutrition extraction — avoids fragile regex/markdown stripping of free-text responses.

**Trade-offs:**
- (+) Deterministic field names; maps 1:1 to `shared-types`
- (+) `strict: true` reduces hallucinated extra keys
- (−) Schema must be maintained when `NutritionResult` changes
- (−) Still need server-side validation (ranges, non-negative macros)

**Example schema fields:**
```typescript
// apps/backend/src/services/nutrition-schema.ts
export const NUTRITION_JSON_SCHEMA = {
  type: 'object',
  properties: {
    foodName: { type: 'string' },
    calories: { type: 'number' },
    protein: { type: 'number' },
    carbs: { type: 'number' },
    fat: { type: 'number' },
    fiber: { type: 'number' },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
  },
  required: ['foodName', 'calories', 'protein', 'carbs', 'fat', 'fiber', 'confidence'],
  additionalProperties: false,
} as const;
```

### Pattern 3: FSD State Separation (unchanged, enforced)

**What:** TanStack Query owns analyze API response; Zustand owns image selection and diary; never mix.

**When to use:** Already in codebase — preserve during AI integration.

**Trade-offs:**
- (+) Clear retry/cache semantics for expensive AI calls
- (+) Diary survives refresh via `persist` without coupling to API
- (−) Image lost on refresh (by design) — user must re-upload if they leave `/result` mid-analysis

**Data ownership:**

| State | Owner | Persistence |
|-------|-------|-------------|
| `selectedImage`, `previewUrl` | `useImageStore` | Memory only |
| Analyze response | TanStack Query cache | Memory (5 min gcTime) |
| `meals[]` | `useDiaryStore` | `localStorage` key `ai-food-diary` |

### Pattern 4: Error Normalization Pipeline

**What:** Backend maps OpenAI/validation failures to `ApiError` JSON; Axios interceptor rejects with typed `ApiError`; UI shows toast or inline message.

**When to use:** All error paths from `/analyze-food`.

**Error code mapping (recommended):**

| Condition | HTTP | `code` | User message (RU/EN) |
|-----------|------|--------|----------------------|
| No file / wrong field | 400 | `INVALID_IMAGE` | Please select a food photo |
| File too large | 413 | `IMAGE_TOO_LARGE` | Image must be under 10 MB |
| OpenAI rate limit | 429 | `RATE_LIMITED` | Too many requests, try again |
| OpenAI timeout / 5xx | 502 | `AI_UNAVAILABLE` | Analysis temporarily unavailable |
| Unparseable model output | 502 | `PARSE_ERROR` | Could not read nutrition data |
| Missing API key (dev) | 503 | `SERVICE_MISCONFIGURED` | Service not configured |

**Example backend error middleware:**
```typescript
// apps/backend/src/lib/errors.ts
export class AnalyzeFoodError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string,
  ) { super(message); }
}

// In route catch block:
res.status(err.status).json({ message: err.message, code: err.code, status: err.status });
```

**Frontend:** `ResultPage` already handles `isError`; add Sonner `toast.error(apiError.message)` in hook or page. Axios interceptor already extracts `message`, `code`, `status` from response body.

## Data Flow

### Request Flow (Photo → AI → Diary)

```
User selects image (AddFoodPage)
    ↓
useImageStore.setImage(file) + navigate /result
    ↓
ResultPage mounts → useAnalyzeFood(selectedImage) [enabled: file !== null]
    ↓
analyzeFoodApi: FormData.append('image', file) → POST /analyze-food
    ↓
Backend: multer.memoryStorage() → Buffer + mimetype
    ↓
analyzeFoodImage(buffer, mime) → OpenAI vision + json_schema
    ↓
parseNutritionResult → NutritionResult
    ↓
res.json({ result, processingTime })  // AnalyzeFoodResponse
    ↓
TanStack Query caches response → ResultPage renders NutritionCard
    ↓
User taps "Save to Diary" → useSaveMeal(result)
    ↓
NutritionResult → Meal + FoodItem → useDiaryStore.addMeal()
    ↓
Zustand persist → localStorage['ai-food-diary']
    ↓
clearImage() + navigate / → HomePage reads meals from store
```

### State Management Flow

```
┌─────────────────┐     subscribe      ┌──────────────────┐
│ useDiaryStore   │◀───────────────────│ HomePage widgets │
│ (persist)       │                    │ DiaryPage        │
└────────┬────────┘                    └──────────────────┘
         │ addMeal()
         ▲
┌────────┴────────┐
│ useSaveMeal()   │◀── NutritionResult from Query data
└─────────────────┘

┌─────────────────┐     queryFn        ┌──────────────────┐
│ useAnalyzeFood  │───────────────────▶│ analyzeFoodApi   │
│ (TanStack Query)│◀───────────────────│ POST /analyze-food│
└────────┬────────┘     AnalyzeFoodResponse
         │ enabled by
         ▼
┌─────────────────┐
│ useImageStore   │  (File reference only — not sent to Zustand persist)
└─────────────────┘
```

### Key Data Flows

1. **Image upload flow:** `File` object stays in browser memory → sent once as multipart → backend reads into `Buffer` → base64 data URL for OpenAI → image never stored on disk or returned to client.
2. **Nutrition result flow:** OpenAI JSON → server parse/validate → `NutritionResult` in `AnalyzeFoodResponse` → Query cache → UI widgets → optional save to diary.
3. **Persistence flow:** Only `Meal[]` hits `localStorage`; API responses and images are ephemeral. Reloading `/` restores diary; reloading `/result` without image redirects to `/add`.

### Prompt Design (Backend-Only)

**System prompt responsibilities:**
- Role: nutrition estimation assistant analyzing food photos
- Output: single serving estimate; integers for macros; `confidence` 0–1
- Constraints: if not food, return low confidence and best-guess name "Unknown food"
- Disclaimer: estimates only, not medical advice (display in UI footer optional)

**User prompt (paired with image):**
- "Estimate nutrition for the food in this image. Assume a typical single serving visible in the photo."

**Do not** embed prompt strings in frontend — keeps tuning server-side and prevents prompt leakage inspection in bundle.

## Suggested Build Order

Dependencies between components — implement in this sequence:

| Order | Component | Depends On | Rationale |
|-------|-----------|------------|-----------|
| 1 | `packages/shared-types` | — | Add error code constants if desired; confirm `NutritionResult` fields match JSON schema |
| 2 | `apps/backend` env + `openai-client.ts` | shared-types | `OPENAI_API_KEY`, `openai` npm package, SDK singleton |
| 3 | `nutrition-schema.ts` + `prompts/nutrition.ts` | NutritionResult shape | Schema and prompt before service integration |
| 4 | `parse-nutrition.ts` + `errors.ts` | schema | Validation/coercion before live API calls |
| 5 | `analyze-food.service.ts` | client, prompts, parser | Core AI logic; unit-testable with mocked SDK |
| 6 | `routes/analyze-food.ts` refactor | service, errors | Replace `setTimeout` mock; keep multer + same route path |
| 7 | Backend error middleware | errors | Global handler for consistent `ApiError` JSON |
| 8 | `useDiaryStore` persist verification | — | Already implemented; add hydration test / manual QA |
| 9 | Frontend error UX (Sonner toasts) | backend errors stable | Wire `toast.error` on analyze failure |
| 10 | E2E manual flow QA | all above | photo → real AI → save → refresh → diary intact |

**Parallelizable:** Steps 8–9 can run in parallel with 5–7 once backend contract is stable.

**Frontend analyze-food slice:** No structural changes required if `POST /analyze-food` response shape is preserved. Optional: increase axios timeout to 60s for slow vision calls; set `retry: 1` (not 2) for 429 to avoid cost doubling.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0–1k users (MVP) | Single Express process, no Redis, no image storage. `detail: 'low'` on vision input to reduce tokens/cost. |
| 1k–100k users | Add per-IP rate limiting on `/analyze-food`; structured logging (latency, tokens, cost); consider response caching keyed by image hash (privacy tradeoff). |
| 100k+ users | Queue-based analysis (BullMQ + worker); object storage for images if re-analysis needed; auth + per-user quotas; move off in-memory multer limits. |

### Scaling Priorities

1. **First bottleneck:** OpenAI latency (3–15s) and cost per image — mitigate with `detail: 'low'`, image size cap (resize client-side optional), and single retry policy.
2. **Second bottleneck:** Unauthenticated public endpoint abuse — add IP rate limiting before any public deploy; no API key on client means backend is the only gate.

## Anti-Patterns

### Anti-Pattern 1: OpenAI SDK in Frontend

**What people do:** `VITE_OPENAI_API_KEY` in React, direct `fetch` to `api.openai.com`.

**Why it's wrong:** Key exposed in bundle; unlimited client-side abuse; violates project security constraint.

**Do this instead:** Backend proxy only; mobile talks to `/analyze-food`.

### Anti-Pattern 2: Storing AI Response in Zustand

**What people do:** `useAnalyzeStore.setResult(data)` after API call.

**Why it's wrong:** Breaks FSD server-state rule; duplicates Query cache; stale data on retry.

**Do this instead:** Keep `useAnalyzeFood` as sole owner; components read `data` from Query.

### Anti-Pattern 3: Free-Text JSON Parsing Without Schema

**What people do:** Prompt "return JSON" without `response_format: json_schema`; regex extract from markdown.

**Why it's wrong:** Fragile parsing, production failures, extra repair LLM calls.

**Do this instead:** Strict JSON schema structured output + server-side `parseNutritionResult` with validation fallback to `PARSE_ERROR`.

### Anti-Pattern 4: Persisting Images in localStorage

**What people do:** Base64 image in Zustand persist for "resume analysis."

**Why it's wrong:** 5MB+ localStorage quota exhaustion; privacy concern; unnecessary for MVP flow.

**Do this instead:** Keep image ephemeral; redirect to `/add` if missing; diary stores nutrition numbers only.

### Anti-Pattern 5: Leaking OpenAI Errors to Client

**What people do:** `res.status(500).json({ message: openaiError.raw })`.

**Why it's wrong:** May expose internal details, model names, token info.

**Do this instead:** Log full error server-side; return sanitized `ApiError` with user-safe `message`.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| OpenAI Vision | Official `openai` Node SDK in backend service | Base64 `image_url` from multer buffer; use `json_schema` structured output |
| Browser localStorage | Zustand `persist` middleware | Key `ai-food-diary`; JSON serialize `Meal[]` only |
| (Future) Auth | Not in MVP | Proxy pattern unchanged; add middleware before route |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `features/analyze-food` ↔ `shared/api` | `analyzeFoodApi` → axios | FormData; no feature-to-feature API calls |
| `features/save-meal` ↔ `entities/meal` | Direct Zustand action | Maps `NutritionResult` → `Meal`; no API |
| `routes/analyze-food` ↔ `services/` | Function call | Route handles HTTP; service has no `req/res` |
| `services/` ↔ `shared-types` | Type imports | Response must satisfy `AnalyzeFoodResponse` |
| Mobile ↔ Backend | REST `POST /analyze-food` | Contract frozen for MVP; versioning later via `/v2` if needed |

## localStorage Persistence Layer

**Current state:** `useDiaryStore` already uses `persist({ name: 'ai-food-diary' })` — meals survive page reload.

**Architecture role:**

```
useSaveMeal()
    → addMeal(meal: Meal)
        → Zustand state update
            → persist middleware serializes to localStorage
                → key: "ai-food-diary"
                    → shape: { state: { meals: Meal[] }, version: 0 }
```

**Recommendations for MVP hardening (no architecture change):**
- Add `version` migrator if `Meal` shape changes later
- Optional `partialize` to persist only `meals` (exclude actions)
- On persist rehydration failure: fall back to empty diary, log once
- Do not persist Query analyze cache or images

**What is NOT persisted (by design):**

| Data | Store | On refresh |
|------|-------|------------|
| Selected image | `useImageStore` | Lost → redirect `/add` |
| Analyze result | TanStack Query | Lost → re-fetch if image still present (won't be) |
| Diary meals | `useDiaryStore` | Restored from localStorage |

## Sources

- Existing codebase: `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/INTEGRATIONS.md`, `.planning/PROJECT.md`
- Implementation files: `apps/backend/src/routes/analyze-food.ts`, `apps/mobile/src/features/analyze-food/`, `entities/meal/model/useDiaryStore.ts`
- OpenAI API — Vision image analysis with base64 `image_url`: https://developers.openai.com/api/docs/guides/images (HIGH — Context7 `/websites/developers_openai_api`)
- OpenAI API — Structured outputs `json_schema` strict mode: https://developers.openai.com/api/docs/guides/structured-outputs (HIGH — Context7)
- Backend proxy security pattern: https://zenvanriel.com/ai-engineer-blog/openai-api-best-practices/ (MEDIUM — aligns with official guidance)

---
*Architecture research for: AI Food — OpenAI Vision integration*
*Researched: 2026-06-24*
