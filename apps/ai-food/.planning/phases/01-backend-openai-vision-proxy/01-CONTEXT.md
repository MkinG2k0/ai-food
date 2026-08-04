# Phase 1: Backend OpenAI Vision Proxy - Context

**Gathered:** 2026-06-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the hardcoded mock in `apps/backend/src/routes/analyze-food.ts` with a real OpenAI Vision API call. The API key stays on the backend only — never exposed to the client. The response must conform to the existing `AnalyzeFoodResponse` contract from `@ai-food/shared-types`.

This phase is backend-only. No frontend changes.

</domain>

<decisions>
## Implementation Decisions

### Model & Prompt

- **D-01:** Use `gpt-4o-mini` for Vision analysis. Sufficient quality for food recognition and КБЖУ estimation; ~10× cheaper than gpt-4o. Upgrade to gpt-4o only if quality proves insufficient.
- **D-02:** Use OpenAI JSON mode (`response_format: { type: 'json_object' }`) combined with a system prompt that specifies the exact output schema. Do NOT use Structured Outputs (json_schema) — JSON mode is simpler and sufficient for MVP.
- **D-03:** Write the system prompt in English. LLM instruction-following is more reliable in English. The `foodName` field can remain in English — translation is a frontend concern, not Phase 1.
- **D-04:** Prompt must instruct the model to return exactly: `{ foodName, calories, protein, carbs, fat, fiber, confidence }` where macros are in grams and confidence is 0–1.

### Error Handling (ERR-03)

- **D-05:** Use exactly 4 typed error codes in `ApiError.code`:
  - `INVALID_IMAGE` — file is not a recognizable food image (OpenAI refuses or returns irrelevant content)
  - `RATE_LIMITED` — OpenAI 429 response
  - `ANALYSIS_TIMEOUT` — request exceeds timeout threshold (suggest 30s)
  - `ANALYSIS_FAILED` — all other failures: OpenAI 5xx, network errors, invalid JSON from model
- **D-06:** If OpenAI returns JSON that does not conform to `NutritionResult` structure (missing fields, wrong types), return `ANALYSIS_FAILED` with HTTP 500. Do NOT use fallback/default values.
- **D-07:** Map OpenAI errors to ApiError: detect `RateLimitError` → `RATE_LIMITED` (429), `APITimeoutError` / `APIConnectionTimeoutError` → `ANALYSIS_TIMEOUT` (504), all other OpenAI errors → `ANALYSIS_FAILED` (500).

### API Key Configuration

- **D-08:** Store `OPENAI_API_KEY` in `apps/backend/.env` (not root `.env`). Load via `dotenv` in the backend entry point. This prevents any risk of the key leaking into the Vite build.
- **D-09:** Create `apps/backend/.env.example` with `OPENAI_API_KEY=your_key_here`. The actual `.env` stays in `.gitignore`.

### Response Parsing & Validation

- **D-10:** Add Zod for runtime validation of the OpenAI JSON response. Install `zod` in `apps/backend`. Define a schema matching `NutritionResult` and parse the model's output through it. If Zod throws, return `ANALYSIS_FAILED`.
- **D-11:** Calculate real `processingTime` using `Date.now()` before and after the OpenAI API call. Include it in `AnalyzeFoodResponse` as the actual elapsed milliseconds.

### Claude's Discretion

- OpenAI SDK version choice (`openai` npm package — use latest stable)
- Image delivery format to OpenAI (base64 from multer's `memoryStorage` — already in place)
- Timeout configuration value (suggest 30 000ms)
- Console logging of errors server-side (minimal `console.error` for debuggability)
- Whether to add `dotenv/config` import or use `dotenv.config()` call (prefer explicit `dotenv.config()` at top of `index.ts`)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Requirements
- `.planning/REQUIREMENTS.md` — AI-01, AI-02, ERR-03 are the requirements for this phase

### Existing Backend
- `apps/backend/src/routes/analyze-food.ts` — current mock implementation to replace
- `apps/backend/src/index.ts` — Express entry point where dotenv should be loaded
- `apps/backend/package.json` — current dependencies; add `openai`, `zod`, `dotenv`
- `apps/backend/tsconfig.json` — TypeScript config (CommonJS output, ES2022 target)

### Shared Types Contract
- `packages/shared-types/src/index.ts` — `NutritionResult`, `AnalyzeFoodResponse`, `ApiError` — these are the exact interfaces the backend must produce

### Project Constraints
- `CLAUDE.md` — Security constraint: OpenAI API key only on backend, never in client bundle

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `multer({ storage: multer.memoryStorage() })` already configured in the route — `req.file.buffer` available as `Buffer` for base64 encoding to OpenAI
- `AnalyzeFoodResponse` and `NutritionResult` interfaces already defined in `@ai-food/shared-types` — implement against these exactly
- `ApiError` type already exists in shared-types with `{ message, code, status }` shape

### Established Patterns
- Express route exports default router — maintain this pattern
- No existing error middleware — error responses are returned inline with `res.status(N).json(...)`
- Backend is CommonJS (`"module": "CommonJS"` in tsconfig) — use `require`-style imports or ensure ESM interop

### Integration Points
- Route is mounted at `/analyze-food` in `index.ts` — no routing changes needed
- `multer` upload middleware is already in place — `upload.single('image')` receives the file
- Client sends `multipart/form-data` with field name `image` — this contract must not change

</code_context>

<specifics>
## Specific Ideas

- `gpt-4o-mini` with JSON mode is the chosen path — not function calling, not Structured Outputs
- System prompt in English, specifying exact JSON keys and units
- Zod validation on the parsed JSON before returning to client (even though AI-05 is v2 — user decided to do it now)
- Real `processingTime` measurement (not hardcoded as in the mock)

</specifics>

<deferred>
## Deferred Ideas

- AI-05 (Zod validation) was originally v2 but user decided to implement it in Phase 1 — already included in D-10
- AI-06 (backend image resize via sharp) — still v2, do not implement in Phase 1
- AI-07 (retry without re-upload) — v2
- Structured Outputs (json_schema mode) — deferred, JSON mode is sufficient
- gpt-4o upgrade — deferred until quality assessment after MVP

</deferred>

---

*Phase: 01-backend-openai-vision-proxy*
*Context gathered: 2026-06-24*
