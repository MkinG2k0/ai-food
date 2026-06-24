# Phase 1: Backend OpenAI Vision Proxy - Research

**Researched:** 2026-06-24
**Domain:** OpenAI Node SDK (v6), Vision via Chat Completions, Zod v4 runtime validation, dotenv
**Confidence:** HIGH (all critical claims verified against npm registry and official docs)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Use `gpt-4o-mini` for Vision analysis. Upgrade to gpt-4o only if quality proves insufficient.
- **D-02:** Use OpenAI JSON mode (`response_format: { type: 'json_object' }`) — NOT Structured Outputs.
- **D-03:** System prompt in English.
- **D-04:** Prompt must return exactly: `{ foodName, calories, protein, carbs, fat, fiber, confidence }` — macros in grams, confidence 0–1.
- **D-05:** Exactly 4 typed error codes: `INVALID_IMAGE | RATE_LIMITED | ANALYSIS_TIMEOUT | ANALYSIS_FAILED`
- **D-06:** If Zod validation fails, return `ANALYSIS_FAILED` (HTTP 500). No fallback/default values.
- **D-07:** Error mapping: `RateLimitError` → `RATE_LIMITED` (429), `APITimeoutError`/`APIConnectionTimeoutError` → `ANALYSIS_TIMEOUT` (504), all others → `ANALYSIS_FAILED` (500).
- **D-08:** `OPENAI_API_KEY` in `apps/backend/.env`, loaded via `dotenv` in entry point.
- **D-09:** Create `apps/backend/.env.example` with `OPENAI_API_KEY=your_key_here`.
- **D-10:** Add Zod for runtime validation of OpenAI JSON response. Install `zod` in `apps/backend`.
- **D-11:** Real `processingTime` via `Date.now()` before/after OpenAI call.

### Claude's Discretion

- OpenAI SDK version (`openai` npm package — use latest stable)
- Image delivery to OpenAI (base64 from multer `memoryStorage` — already in place)
- Timeout configuration value (suggest 30 000ms)
- Console logging of errors server-side (minimal `console.error`)
- Whether to use `dotenv/config` import or `dotenv.config()` call (prefer explicit `dotenv.config()` at top of `index.ts`)

### Deferred Ideas (OUT OF SCOPE)

- AI-06: Backend image resize via `sharp` — v2 only
- AI-07: Retry without re-upload — v2 only
- Structured Outputs (json_schema mode) — deferred
- gpt-4o upgrade — deferred until quality assessment
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AI-01 | User receives real nutrition analysis from OpenAI Vision via backend proxy (API key never exposed to client) | OpenAI SDK v6 Chat Completions + base64 image upload; key loaded server-side via dotenv |
| AI-02 | Backend returns structured `NutritionResult` (foodName, calories, protein, carbs, fat, fiber, confidence) matching shared-types contract | JSON mode + Zod schema that mirrors `NutritionResult`; failed parse → ANALYSIS_FAILED |
| ERR-03 | Backend returns typed `ApiError` for common failure modes (timeout, rate limit, invalid image, service error) | 4 error codes mapped from OpenAI SDK error classes; inline `res.status(N).json(apiError)` |
</phase_requirements>

---

## Summary

This phase replaces the hardcoded mock in `apps/backend/src/routes/analyze-food.ts` with a real OpenAI Vision call. The route already has multer `memoryStorage` configured, so `req.file.buffer` is immediately available for base64 encoding. The only backend file changes are: (1) install three new packages, (2) load dotenv in `index.ts`, (3) rewrite the route body.

The OpenAI npm package has jumped to **v6.44.0** as of 2026-06-18 (latest dist-tag). v6 dropped node-fetch in favour of native `fetch` and moved several beta methods to stable. For chat completions with vision and JSON mode — the API call shape is **unchanged** from v4: same `client.chat.completions.create()` signature, same `response_format`, same `image_url` content-part pattern with `data:image/jpeg;base64,` prefix. The error class names (`RateLimitError`, `APIConnectionTimeoutError`) are also the same. The key v6 compatibility concern is that it requires zod `^3.25 || ^4.0` as a peer dependency — using zod v4.4.3 satisfies this.

dotenv v17 is the current stable release (17.4.2). The `dotenv.config()` call API is unchanged. The `.env` file is already listed in root `.gitignore` and the backend has no existing dotenv setup, so a clean install is straightforward.

**Primary recommendation:** Install `openai@^6.44.0`, `zod@^4.4.3`, `dotenv@^17.4.2` in `apps/backend`; add `dotenv.config()` at the top of `index.ts`; rewrite the route using the existing multer buffer converted to base64.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `openai` | 6.44.0 | Official OpenAI Node SDK — Chat Completions, error types, timeout | Only official SDK; native fetch, no extra deps |
| `zod` | 4.4.3 | Runtime validation of OpenAI JSON response | Peer-required by openai v6; D-10 requires it |
| `dotenv` | 17.4.2 | Load `OPENAI_API_KEY` from `apps/backend/.env` | D-08/D-09 locked; standard Node.js env pattern |

All three are **additions** to `apps/backend/package.json`. No existing deps change.

[VERIFIED: npm registry — `npm view openai dist-tags.latest` → 6.44.0, published 2026-06-18]
[VERIFIED: npm registry — `npm view zod dist-tags.latest` → 4.4.3]
[VERIFIED: npm registry — `npm view dotenv dist-tags.latest` → 17.4.2]
[VERIFIED: npm registry — `npm view openai@6.44.0 peerDependencies` → `{ zod: '^3.25 || ^4.0' }`]

### Supporting (already present, no change)

| Library | Version | Purpose |
|---------|---------|---------|
| `multer` | 1.4.5-lts.2 | Multipart upload — `memoryStorage` gives `req.file.buffer` |
| `@ai-food/shared-types` | workspace:* | `NutritionResult`, `AnalyzeFoodResponse`, `ApiError` contracts |

### Installation

```bash
pnpm --filter @ai-food/backend add openai zod dotenv
pnpm --filter @ai-food/backend add -D @types/dotenv
```

Note: `dotenv` v17 ships its own TypeScript types — `@types/dotenv` is not needed and does not exist on npm. Use `dotenv` directly; TypeScript types are bundled.

[VERIFIED: npm registry — `npm view @types/dotenv` shows no package]

---

## Architecture Patterns

### Pattern 1: dotenv initialization — load before anything else

**What:** Call `dotenv.config()` at the very first line of `apps/backend/src/index.ts`, before any imports that read `process.env`.

**Why:** Node.js CJS module evaluation is synchronous top-to-bottom. The OpenAI client reads `process.env.OPENAI_API_KEY` at construction time. If dotenv runs after the client is constructed, the key will be `undefined`.

```typescript
// apps/backend/src/index.ts — TOP of file, before other imports
import dotenv from 'dotenv';
dotenv.config(); // populates process.env from apps/backend/.env

import express from 'express';
// ... rest of setup
```

[ASSUMED: Import-then-call is standard dotenv pattern; dotenv.config() path defaults to cwd's .env which for `tsx watch src/index.ts` is `apps/backend/`]

### Pattern 2: OpenAI client construction (singleton per process)

```typescript
// apps/backend/src/routes/analyze-food.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30_000, // 30s — covers D-05 ANALYSIS_TIMEOUT
});
```

[VERIFIED: MIGRATION.md + README — `new OpenAI({ apiKey, timeout })` unchanged in v6]

### Pattern 3: Chat Completions with base64 image + JSON mode

```typescript
const base64Image = req.file!.buffer.toString('base64');
const mimeType = req.file!.mimetype; // 'image/jpeg', 'image/png', etc.

const startTime = Date.now();

const completion = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  response_format: { type: 'json_object' },
  messages: [
    {
      role: 'system',
      content: `You are a nutrition analysis assistant. Analyze the food in the image and return ONLY a JSON object with these exact fields:
{
  "foodName": string (name of the food in English),
  "calories": number (total kilocalories),
  "protein": number (grams),
  "carbs": number (grams),
  "fat": number (grams),
  "fiber": number (grams),
  "confidence": number (0.0 to 1.0, your confidence in the estimate)
}
Do not include any text outside the JSON object.`,
    },
    {
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: {
            url: `data:${mimeType};base64,${base64Image}`,
          },
        },
        {
          type: 'text',
          text: 'Analyze this food image and return the nutrition data as JSON.',
        },
      ],
    },
  ],
});

const processingTime = Date.now() - startTime;
```

[VERIFIED: platform.openai.com/docs (via redirect to developers.openai.com) — base64 data URI pattern, gpt-4o-mini supports vision, response_format: json_object works with vision]
[CITED: https://developers.openai.com/api/docs/guides/images]

### Pattern 4: Zod validation of OpenAI response

```typescript
import { z } from 'zod';

const NutritionResultSchema = z.object({
  foodName: z.string(),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  fiber: z.number(),
  confidence: z.number().min(0).max(1),
});

// After getting completion:
const rawText = completion.choices[0]?.message?.content;
if (!rawText) throw new Error('Empty response from OpenAI');

const parsed = NutritionResultSchema.parse(JSON.parse(rawText));
// parsed is typed as NutritionResult — matches shared-types interface
```

[CITED: zod.dev — z.object(), z.string(), z.number() API unchanged in v4]
[ASSUMED: Zod v4 `z.object().parse()` throws `ZodError` on validation failure — same as v3]

### Pattern 5: Error mapping (D-07)

```typescript
import OpenAI from 'openai';

function handleOpenAIError(error: unknown): never {
  if (error instanceof OpenAI.RateLimitError) {
    res.status(429).json({ message: 'OpenAI rate limit exceeded. Try again later.', code: 'RATE_LIMITED', status: 429 });
    return;
  }
  if (error instanceof OpenAI.APIConnectionTimeoutError || (error instanceof OpenAI.APIError && error.status === 408)) {
    res.status(504).json({ message: 'Analysis timed out. Please try again.', code: 'ANALYSIS_TIMEOUT', status: 504 });
    return;
  }
  // ZodError or invalid JSON
  res.status(500).json({ message: 'Analysis failed. Please try again.', code: 'ANALYSIS_FAILED', status: 500 });
}
```

[VERIFIED: github.com/openai/openai-node README — error class names `RateLimitError`, `APIConnectionTimeoutError` confirmed in v6]

### Pattern 6: INVALID_IMAGE detection

The OpenAI API itself does not return a specific error for "not a food image" — it returns a valid JSON response but with low confidence or a foodName like "not food". The `INVALID_IMAGE` code applies when:
- OpenAI returns a 400 (`BadRequestError`) — e.g., unsupported file format or corrupted image
- The model's JSON contains a signal that analysis was refused (implementation-specific)

Detection approach:
- `OpenAI.BadRequestError` → `INVALID_IMAGE` (HTTP 400)
- Low confidence alone is NOT an error — return it to the client and let them decide

[ASSUMED: OpenAI does not define a first-class "not food" error; BadRequestError is the closest signal. The confidence field handles ambiguous content.]

### Anti-Patterns to Avoid

- **`dotenv/config` side-effect import** (`import 'dotenv/config'`): Valid but less explicit. Prefer `dotenv.config()` call per D-11 discretion.
- **Storing the OpenAI client inside the route handler**: Creates a new client per request. Construct once at module scope.
- **`JSON.parse` without try/catch**: If the model returns non-JSON despite JSON mode, `JSON.parse` throws. Wrap it: catch → `ANALYSIS_FAILED`.
- **Using `req.file.path`**: multer memoryStorage does NOT write to disk. Use `req.file.buffer` only.
- **Exposing raw OpenAI error messages to client**: Log via `console.error`, return generic `ApiError` shape.
- **`response_format: json_object` without a system prompt mentioning JSON**: OpenAI warns this may cause errors. The system prompt MUST include the word "JSON" and the schema.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OpenAI API client | Custom `axios` calls to api.openai.com | `openai` SDK | Auth headers, retry logic, streaming, typed responses, error classes |
| JSON validation | Custom type guards | `zod` | Edge cases: extra fields, wrong types, undefined nested fields |
| Base64 from Buffer | Manual byte encoding | `Buffer.toString('base64')` | Already in Node.js — zero deps |
| MIME type detection | File header inspection | Use `req.file.mimetype` from multer | multer already parsed Content-Type |

---

## Common Pitfalls

### Pitfall 1: dotenv loaded too late

**What goes wrong:** `process.env.OPENAI_API_KEY` is `undefined` when `new OpenAI()` runs.
**Why it happens:** `dotenv.config()` called after module-level `new OpenAI()` construction.
**How to avoid:** `dotenv.config()` must be the very first executed statement in `index.ts`, before any import that reads env vars.
**Warning signs:** `AuthenticationError` from OpenAI SDK on first request.

### Pitfall 2: `ANALYSIS_TIMEOUT` not triggering

**What goes wrong:** Request hangs for 10+ minutes (OpenAI default) before error.
**Why it happens:** `timeout` not passed to `new OpenAI(...)`.
**How to avoid:** Always pass `timeout: 30_000` in the client constructor.

### Pitfall 3: JSON.parse throws on empty or non-JSON content

**What goes wrong:** Even with `response_format: { type: 'json_object' }`, if OpenAI returns an empty string or refuses the request, `.choices[0].message.content` may be `null` or a refusal message.
**Why it happens:** JSON mode reduces but does not eliminate non-JSON responses.
**How to avoid:** Check `content` is truthy before `JSON.parse`; wrap both in try/catch → `ANALYSIS_FAILED`.

### Pitfall 4: Multer error when no file is sent

**What goes wrong:** `req.file` is `undefined`; `req.file!.buffer.toString('base64')` throws.
**Why it happens:** Client sent request without an image field.
**How to avoid:** Check `if (!req.file)` before processing; return `INVALID_IMAGE` (400).

### Pitfall 5: ESM/CJS interop with openai v6

**What goes wrong:** `import OpenAI from 'openai'` fails at runtime under CommonJS.
**Why it happens:** openai v6 ships ESM and CJS; `tsconfig.json` has `"module": "CommonJS"` and `"esModuleInterop": true` — this should work, but needs verification.
**How to avoid:** `esModuleInterop: true` is already in `apps/backend/tsconfig.json`. Use `import OpenAI from 'openai'` (default import). If issues arise, try `const { default: OpenAI } = require('openai')` — but with tsx this should not be needed.

### Pitfall 6: zod v4 import path change

**What goes wrong:** `import { z } from 'zod/v4'` used instead of `import { z } from 'zod'`.
**Why it happens:** zod v4 briefly had a compatibility shim at `zod/v4`.
**How to avoid:** Use `import { z } from 'zod'` — this is the canonical import for zod v4.4.x.

[ASSUMED: zod v4 top-level import path is `'zod'` — standard, not changed]

---

## Code Examples

### Complete route skeleton

```typescript
// apps/backend/src/routes/analyze-food.ts
import { Router, Request, Response } from 'express';
import multer from 'multer';
import OpenAI from 'openai';
import { z } from 'zod';
import type { AnalyzeFoodResponse, ApiError } from '@ai-food/shared-types';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30_000,
});

const NutritionResultSchema = z.object({
  foodName: z.string(),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  fiber: z.number(),
  confidence: z.number().min(0).max(1),
});

const SYSTEM_PROMPT = `You are a nutrition analysis assistant. Analyze the food in the image and return ONLY a JSON object with these exact fields:
{
  "foodName": string (name of the food in English),
  "calories": number (total kilocalories for a typical serving),
  "protein": number (grams),
  "carbs": number (grams),
  "fat": number (grams),
  "fiber": number (grams),
  "confidence": number (0.0 to 1.0, your confidence in the estimate)
}
Do not include any text outside the JSON object.`;

function sendApiError(res: Response, status: number, code: string, message: string): void {
  const body: ApiError = { message, code, status };
  res.status(status).json(body);
}

router.post('/', upload.single('image'), async (req: Request, res: Response) => {
  if (!req.file) {
    return sendApiError(res, 400, 'INVALID_IMAGE', 'No image file provided.');
  }

  const base64Image = req.file.buffer.toString('base64');
  const mimeType = req.file.mimetype;
  const startTime = Date.now();

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64Image}` },
            },
            { type: 'text', text: 'Analyze this food image and return the nutrition data as JSON.' },
          ],
        },
      ],
    });

    const processingTime = Date.now() - startTime;
    const rawContent = completion.choices[0]?.message?.content;

    if (!rawContent) {
      console.error('OpenAI returned empty content');
      return sendApiError(res, 500, 'ANALYSIS_FAILED', 'Analysis returned empty response.');
    }

    let parsed;
    try {
      parsed = NutritionResultSchema.parse(JSON.parse(rawContent));
    } catch (validationError) {
      console.error('Zod/JSON parse error:', validationError);
      return sendApiError(res, 500, 'ANALYSIS_FAILED', 'Analysis response did not match expected schema.');
    }

    const response: AnalyzeFoodResponse = { result: parsed, processingTime };
    return res.json(response);

  } catch (error) {
    console.error('OpenAI API error:', error);

    if (error instanceof OpenAI.RateLimitError) {
      return sendApiError(res, 429, 'RATE_LIMITED', 'OpenAI rate limit exceeded. Please try again later.');
    }
    if (error instanceof OpenAI.APIConnectionTimeoutError) {
      return sendApiError(res, 504, 'ANALYSIS_TIMEOUT', 'Analysis timed out. Please try again.');
    }
    if (error instanceof OpenAI.BadRequestError) {
      return sendApiError(res, 400, 'INVALID_IMAGE', 'The image could not be processed. Please try a different photo.');
    }
    return sendApiError(res, 500, 'ANALYSIS_FAILED', 'Analysis failed. Please try again.');
  }
});

export default router;
```

### dotenv in index.ts

```typescript
// apps/backend/src/index.ts — FIRST lines
import dotenv from 'dotenv';
dotenv.config(); // must run before OpenAI client construction in route module

import express from 'express';
import cors from 'cors';
import analyzeFoodRouter from './routes/analyze-food';
// ... rest unchanged
```

### .env.example

```
OPENAI_API_KEY=your_key_here
PORT=3001
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `openai` v4 (node-fetch) | `openai` v6 (native fetch) | 2026 | No API surface change for chat completions |
| `zod` v3 | `zod` v4.4.x | 2025 | Same `z.object()` API; `openai` v6 peer-requires `^3.25 || ^4.0` |
| `dotenv` v16 | `dotenv` v17 | 2024-2025 | `dotenv.config()` call API unchanged |

**Deprecated/outdated:**
- `import 'dotenv/config'` — works but harder to control load order; prefer `dotenv.config()` call.
- `openai` v4 — no longer on `latest` dist-tag; v6 is the current stable release.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `dotenv.config()` path defaults to cwd (apps/backend/) when tsx runs from that package | Pattern 1 | dotenv may not find `.env`; workaround: pass `{ path: path.resolve(__dirname, '../.env') }` |
| A2 | OpenAI v6 does not define a first-class "not food" error; `BadRequestError` is the closest signal for `INVALID_IMAGE` | Pattern 5 & 6 | `INVALID_IMAGE` may never trigger for semantic refusals — acceptable for MVP |
| A3 | Zod v4 `z.object().parse()` throws `ZodError` on validation failure (same as v3) | Pattern 4 | If error type changes, catch block still catches `unknown` — no runtime risk |
| A4 | `import OpenAI from 'openai'` works with `esModuleInterop: true` + CommonJS output | Pitfall 5 | May need `require('openai').default` — low risk, tsx handles this well |
| A5 | `import { z } from 'zod'` is the canonical import for zod v4 (not `zod/v4`) | Pattern 4 | Wrong import path → module not found at runtime |

---

## Open Questions

1. **dotenv cwd when running via Turborepo**
   - What we know: `pnpm --filter @ai-food/backend dev` runs `tsx watch src/index.ts` from `apps/backend/`
   - What's unclear: When `turbo dev` runs both apps, does it cd into each package? Turborepo normally does.
   - Recommendation: Use `dotenv.config()` without arguments for MVP; if env not found, fallback to `dotenv.config({ path: resolve(__dirname, '../.env') })`.

2. **Multer MIME type reliability**
   - What we know: `req.file.mimetype` is set from Content-Type header of the upload part
   - What's unclear: Client may send wrong MIME type; OpenAI accepts base64 data URIs and validates the actual image bytes
   - Recommendation: Use `req.file.mimetype` as-is; OpenAI will return `BadRequestError` for truly unsupported formats.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js >= 18 | `openai` v6 native fetch | ✓ | 22.22.0 | — |
| pnpm | Package install | ✓ | 9.6.0 | — |
| `openai` npm package | AI-01 | ✗ (not yet installed) | — | None — must install |
| `zod` npm package | D-10 | ✗ (not yet installed) | — | None — must install |
| `dotenv` npm package | D-08 | ✗ (not yet installed) | — | None — must install |
| `OPENAI_API_KEY` env var | AI-01 runtime | ✗ (not in .env) | — | User must create `apps/backend/.env` |

**Missing dependencies with no fallback:**
- `openai`, `zod`, `dotenv` — must be installed before implementation
- `OPENAI_API_KEY` — developer must obtain from platform.openai.com and add to `apps/backend/.env`

---

## Validation Architecture

No automated tests are required for this phase. The phase is a backend-only integration replacement. Manual smoke testing is the validation gate:

- Run `pnpm dev` from root
- Upload a food photo via the frontend → verify real nutrition data returned
- Verify TypeScript compiles: `pnpm --filter @ai-food/backend build`
- Verify error codes: test with no file, with a non-food image (if API returns 400)

**Per task commit:** `pnpm --filter @ai-food/backend build` (type-check via tsc)
**Phase gate:** Successful real API call returning `AnalyzeFoodResponse` shape before `/gsd-verify-work`

Wave 0 gaps: None — no test framework setup needed for this backend-only integration phase.

---

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No user auth in MVP |
| V3 Session Management | No | Stateless API |
| V4 Access Control | No | Single-user MVP |
| V5 Input Validation | Yes | Multer limits file size; Zod validates OpenAI output |
| V6 Cryptography | No | No crypto hand-rolled |

### Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| API key leaked in client bundle | Information Disclosure | dotenv in backend only; Vite never imports backend env vars |
| Oversized image upload (DoS) | Denial of Service | Add multer `limits: { fileSize: 10 * 1024 * 1024 }` (10MB) — recommended but not locked |
| Malformed multipart body | Tampering | multer handles; check `req.file` before use |
| OpenAI response injection | Tampering | Zod schema strips extra fields; no eval/exec of model output |

**Key security constraint from CLAUDE.md:** `OPENAI_API_KEY` MUST stay in `apps/backend/.env` — never in `apps/mobile/.env` or any VITE_* variable.

---

## Sources

### Primary (HIGH confidence)
- npm registry (`npm view openai dist-tags`) — openai v6.44.0 is current `latest`, published 2026-06-18
- npm registry (`npm view openai@6.44.0 peerDependencies`) — zod `^3.25 || ^4.0` required
- npm registry (`npm view zod dist-tags.latest`) — zod 4.4.3
- npm registry (`npm view dotenv dist-tags.latest`) — dotenv 17.4.2
- [github.com/openai/openai-node README](https://github.com/openai/openai-node/blob/master/README.md) — error class names, timeout config
- [github.com/openai/openai-node MIGRATION.md](https://raw.githubusercontent.com/openai/openai-node/master/MIGRATION.md) — v4→v6 breaking changes
- [developers.openai.com/api/docs/guides/images](https://developers.openai.com/api/docs/guides/images) — base64 vision API, gpt-4o-mini support, JSON mode with vision

### Secondary (MEDIUM confidence)
- Codebase inspection: `apps/backend/src/routes/analyze-food.ts` — confirmed `multer.memoryStorage()` already in place, `req.file.buffer` available
- Codebase inspection: `apps/backend/tsconfig.json` — confirmed `esModuleInterop: true`, `module: CommonJS`
- Codebase inspection: `.gitignore` — confirmed `.env` excluded at root level

### Tertiary (LOW confidence)
- None — no unverified WebSearch-only claims

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all package versions verified against npm registry
- Architecture: HIGH — route pattern verified against existing codebase; OpenAI call pattern verified against official docs
- Pitfalls: MEDIUM — dotenv load order and ESM/CJS interop from training knowledge + tsconfig inspection; OpenAI error classes verified from README

**Research date:** 2026-06-24
**Valid until:** 2026-07-24 (openai SDK moves fast; re-verify if more than 30 days pass)
