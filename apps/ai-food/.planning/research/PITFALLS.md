# Pitfalls Research

**Domain:** AI nutrition / food photo analysis with OpenAI Vision (web MVP, backend proxy, localStorage diary)
**Researched:** 2026-06-24
**Confidence:** HIGH (stack/security/vision API); MEDIUM (nutrition accuracy magnitudes — peer-reviewed, model-version dependent)

## Critical Pitfalls

### Pitfall 1: Treating Vision Output as Nutritional Ground Truth

**What goes wrong:**
Users see a single calorie/macro number and treat it like a food database lookup. In reality, vision-only models systematically misestimate portion size, miss hidden fats (cooking oil, dressings, fillings), and show nutrient-specific bias — lipids are often overestimated while protein accuracy is poor. Energy/carbs can look plausible on simple meals yet be wrong by 30–50%+ on complex plates. High model `confidence` does not mean high accuracy; models can agree with each other on the wrong answer.

**Why it happens:**
Developers conflate "the model returned JSON with numbers" with "the numbers are correct." Mock backends (like the current hardcoded `Grilled Chicken Salad`) hide this until real images expose variance. Product copy and UI reinforce precision (exact grams, progress bars) without uncertainty ranges or edit affordances.

**How to avoid:**
- Position AI output as an **estimate the user confirms/edits**, not a diagnosis.
- Show `confidence` as a soft signal, not a guarantee; add inline edit on Result screen before save.
- Use Chain-of-Thought prompting: identify items → estimate portions → sum macros (validated research pattern).
- Defer medical/clinical claims; never auto-dose or give health advice from vision alone.
- Log deviation metrics in backend (optional) to tune prompts later.

**Warning signs:**
- QA passes because "it returns JSON every time" without comparing to known meals.
- Fat values swing wildly between similar photos; complex meals always look "reasonable."
- Users report distrust after comparing to package labels.
- `confidence` is always high (>0.8) regardless of image quality.

**Phase to address:**
**Phase: AI Analysis Integration** (prompt + schema) and **Phase: Result UX & Confirmation** (edit-before-save, disclaimers).

---

### Pitfall 2: Exposing OpenAI API Key or Calling OpenAI from the Browser

**What goes wrong:**
`OPENAI_API_KEY` ends up in `VITE_*` env vars, client bundle, or a Next.js `NEXT_PUBLIC_` variable. Anyone with DevTools extracts the key and runs unlimited requests on your billing account. Alternatively, a "temporary" direct client call ships to production.

**Why it happens:**
Fastest path to a working demo is client-side `fetch('https://api.openai.com/...')`. Framework env-var naming is confusing (`VITE_` = shipped to browser). Teams skip backend work while mock is being replaced.

**How to avoid:**
- Key **only** in `apps/backend` via `process.env.OPENAI_API_KEY` (no `VITE_` prefix).
- All vision calls through `POST /analyze-food` proxy (already planned in PROJECT.md).
- Add `.env.example` documenting server-only vars; never commit `.env`.
- Set OpenAI dashboard **hard spending limit** and usage alerts before first real traffic.
- Pre-commit secret scanning (`git-secrets`, `detect-secrets`) for `sk-` patterns.

**Warning signs:**
- `grep -r "OPENAI" apps/mobile` finds anything other than types/comments.
- Network tab shows requests to `api.openai.com` from the browser.
- Bundle analyzer includes `openai` package in client chunk.

**Phase to address:**
**Phase: Backend OpenAI Integration** (first task — block client SDK install).

---

### Pitfall 3: Unprotected Backend Proxy → Runaway API Costs

**What goes wrong:**
`/analyze-food` is deployed with open CORS (already `cors()` with no origin filter) and no rate limits. Bots, retries, or a `useAnalyzeFood` refetch loop burn through budget. A single 12MP phone photo at `detail: high` costs far more tokens than a resized JPEG.

**Why it happens:**
Mock server was local-only; production hardening deferred. TanStack Query `retry: 2` + `staleTime: 0` (current `useAnalyzeFood.ts`) re-analyzes the same image on every `/result` visit — tripling cost per user session. No per-IP or per-session throttle exists.

**How to avoid:**
- Rate limit `/analyze-food` (e.g. 10 req/min/IP for MVP; stricter before public deploy).
- Restrict CORS to known frontend origins via env.
- Set `staleTime: Infinity` or `30_000` for immutable file analysis; key query by `crypto.randomUUID()` at pick time (not `name+size+lastModified` — collision risk in CONCERNS.md).
- Resize/compress image **before** OpenAI call (target ~768–1024px longest side, JPEG quality ~0.8).
- Use `detail: "low"` only if portion accuracy is deprioritized; for portion estimation prefer `high` on **resized** image, not full-res.
- Cap upload size in multer (`limits.fileSize`) and reject non-image MIME types.
- Abort OpenAI request on `req.on('close')` / `AbortSignal` when client disconnects.

**Warning signs:**
- OpenAI usage dashboard spikes after deploying without limits.
- Same image triggers multiple API calls in server logs.
- Backend memory grows under concurrent large uploads (`multer.memoryStorage()` with no limits).

**Phase to address:**
**Phase: Backend OpenAI Integration** (rate limit, upload limits, abort) and **Phase: Client Image Pipeline** (compress, query cache).

---

### Pitfall 4: Unstructured or Fragile JSON Parsing from the Model

**What goes wrong:**
Prompt asks for "JSON" in prose; model returns markdown fences, trailing commentary, or wrong field names. Backend `JSON.parse` throws; frontend shows generic "Analysis failed." Partial parses silently drop `fiber`/`confidence` (already happening at save — `useSaveMeal` discards them).

**Why it happens:**
`response_format: { type: "json_object" }` without a strict schema still allows schema drift. Free-text prompts are easier to write than `json_schema` with `strict: true`. Mock backend always returns valid `AnalyzeFoodResponse`, so parsing edge cases are never tested.

**How to avoid:**
- Use OpenAI **Structured Outputs** (`response_format: { type: "json_schema", strict: true }`) matching `NutritionResult` in `packages/shared-types`.
- Validate with Zod (or similar) on backend after parse; return `ApiError` with `code: 'INVALID_AI_RESPONSE'` on failure.
- Map validated response to `AnalyzeFoodResponse`; compute `processingTime` server-side (don't trust model).
- Extend `FoodItem` / save path to persist `fiber` and `confidence` if UI displays them.
- Unit-test parser with fixtures: markdown-wrapped JSON, missing fields, out-of-range numbers.

**Warning signs:**
- Intermittent 500s only on certain food types.
- Production logs show `SyntaxError: Unexpected token` from `JSON.parse`.
- Result screen shows fiber/confidence but saved diary entries don't.

**Phase to address:**
**Phase: AI Analysis Integration** (schema + validation) and **Phase: Save Flow & Types** (align persisted shape).

---

### Pitfall 5: Single-Dish Schema for Multi-Item Meals

**What goes wrong:**
`NutritionResult` is one `foodName` + one macro set. A photo of rice + chicken + salad gets collapsed into one generic label ("Mixed plate") or only the dominant item is counted. Calories are materially wrong; users can't edit individual components.

**Why it happens:**
MVP types and mock response model a single item. Prompt doesn't ask for an itemized breakdown. Save flow creates one `FoodItem` with hardcoded `portion: '1 serving'`.

**How to avoid:**
- Prompt: return `items: [{ name, portionGrams, calories, protein, carbs, fat }]` + `totals`.
- Either extend `NutritionResult` to `items[]` or flatten with clear UX ("3 items detected").
- Let user remove/adjust items on Result screen before save.
- For MVP-minimum: prompt explicitly says "if multiple foods visible, list each separately and sum totals."

**Warning signs:**
- Composite meals consistently undercount calories vs. user expectation.
- `foodName` values like "Various foods" or "Plate of food" appear often.
- Every saved meal has exactly one `FoodItem`.

**Phase to address:**
**Phase: AI Analysis Integration** (schema design) — decide before locking API contract.

---

### Pitfall 6: Full-Resolution Upload + Wrong `detail` → Latency and Cost Blowout

**What goes wrong:**
12MP camera photos (5–15 MB) are POSTed as-is (`analyzeFoodApi` appends raw `File`). Backend base64-encodes and sends to Vision with `detail: high`. Analysis takes 8–15+ seconds; users abandon. Token cost per image is 5–10× higher than necessary. Manual `Content-Type: multipart/form-data` without boundary (known bug in `analyzeFoodApi.ts`) may break real server parsing.

**Why it happens:**
Mock backend ignores image bytes. No client compression step. Developers assume OpenAI "handles" any image size (it scales internally, but you still pay for tile tokenization on effective resolution).

**How to avoid:**
- Client: resize to max 1024px longest edge, JPEG ~80% quality before upload.
- Remove manual `Content-Type` header on FormData — let Axios set boundary.
- Backend: validate MIME (`image/jpeg`, `image/png`, `image/webp`), max 5 MB after client compress.
- Pass `detail: "high"` on **already resized** image for portion work; never on original 4000px+ files.
- Show upload progress / analysis skeleton; set Axios timeout ≥ OpenAI timeout (30–60s).

**Warning signs:**
- Network tab shows multi-MB POST bodies.
- `processingTime` in logs correlates with image megapixels.
- Works on desktop Wi-Fi, fails on mobile LTE (timeout).

**Phase to address:**
**Phase: Client Image Pipeline** (before or with backend integration).

---

### Pitfall 7: localStorage Diary Quota and Schema Corruption

**What goes wrong:**
`useDiaryStore` persists unbounded `meals[]` to `localStorage` (~5–10 MB per origin). After weeks of use, `QuotaExceededError` crashes hydration — white screen on load. If someone stores base64 thumbnails in meals, quota hits in days. Changing `Meal` shape without `persist.version` + `migrate` breaks existing users.

**Why it happens:**
Zustand `persist` defaults are convenient; MVP skips IndexedDB. No try/catch on write. No cap on history length. `fiber`/`confidence` schema changes will ship without migration (store has no `version` — noted in CONCERNS.md).

**How to avoid:**
- Persist **metadata only** — never base64 images in diary JSON.
- Wrap persist writes; catch `QuotaExceededError`, prune oldest meals, toast user.
- Add `version` + `migrate` to persist config before any type change.
- Cap retained meals (e.g. 90 days or 500 entries) with prune on `addMeal`.
- Consider IndexedDB only if storing images locally later (out of MVP scope).

**Warning signs:**
- `localStorage.getItem('ai-food-diary')` size approaches 1 MB+.
- DevTools Application tab shows quota errors on save.
- App works in incognito (empty storage) but fails for returning users.

**Phase to address:**
**Phase: Diary Persistence** (localStorage hardening).

---

### Pitfall 8: Missing Error UX and Retry Semantics for AI Failures

**What goes wrong:**
OpenAI returns 429 (rate limit), 503 (overloaded), or timeout. Frontend shows "Analysis failed" with no retry, no distinction between user error (bad image) vs. transient outage. Sonner toaster is mounted but unused. `useAnalyzeFood` types errors as `Error`, not `ApiError` — status/code unavailable.

**Why it happens:**
Mock backend never fails. Error paths untested. Generic `isError` branch on `ResultPage` only.

**How to avoid:**
- Map OpenAI errors to `ApiError` codes: `RATE_LIMITED`, `AI_UNAVAILABLE`, `INVALID_IMAGE`, `TIMEOUT`.
- `toast.error` with actionable copy; retry button for transient errors.
- Fix `useQuery<AnalyzeFoodResponse, ApiError>` typing.
- Don't retry 400-class errors in TanStack Query (`retry: (count, err) => err.status >= 500`).
- Backend: exponential backoff for 429 with max 2 retries, then fail fast to client.

**Warning signs:**
- Users refresh entire page to retry.
- 429s cause 3× billing (retry: 2 on all errors).
- Support questions: "app broken" during OpenAI incidents.

**Phase to address:**
**Phase: Error Handling & User Feedback** (after backend integration).

---

### Pitfall 9: Race Conditions in Analyze → Result → Save Flow

**What goes wrong:**
User picks image → navigates to `/result` → `useAnalyzeFood` fires. User hits back, picks another image — two in-flight analyses; stale result displays for wrong photo. `ResultPage` redirects to `/add` when `selectedImage` is null — races with `clearImage()` in `useSaveMeal`. Query cache keyed on `name+size+lastModified` serves wrong cached result for different files with identical metadata.

**Why it happens:**
Image identity is weak; no request cancellation; navigation and query lifecycle not coordinated.

**How to avoid:**
- Assign `imageId = crypto.randomUUID()` in `useImageStore` at pick time; include in queryKey and backend request metadata.
- Abort in-flight analyze on new image select (`queryClient.cancelQueries`).
- Pass `analysisId` or keep result in router state, not only query cache.
- Defer `clearImage()` until after navigation completes (CONCERNS.md fragile area).

**Warning signs:**
- Result label doesn't match photo briefly after switching images.
- Network tab shows overlapping POSTs to `/analyze-food`.
- Cached result appears before spinner on second upload of same filename.

**Phase to address:**
**Phase: Client Image Pipeline** and **Phase: Result UX & Confirmation**.

---

### Pitfall 10: Shipping "AI Complete" Without Human-in-the-Loop Confirmation

**What goes wrong:**
Flow auto-saves or presents numbers without edit step. Users accumulate wrong diary data, lose trust, churn. Regulatory/reputation risk if marketed as "accurate tracking."

**Why it happens:**
Mock flow optimizes for speed (photo → result → save). No portion editor, no "adjust serving size," no multi-item review. Hardcoded `'1 serving'` in `useSaveMeal`.

**How to avoid:**
- Result screen: editable fields for name, calories, macros, portion before save.
- Optional: "Looks wrong? Retake photo" CTA.
- Disclaimer: "AI estimates — verify before logging."
- Track edit rate (analytics later) to measure model quality.

**Warning signs:**
- No input fields on Result page — display only.
- Save button immediately commits without user review.
- Diary portion always `'1 serving'`.

**Phase to address:**
**Phase: Result UX & Confirmation** (required for "showable" MVP per PROJECT.md).

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `staleTime: 0` on analyze query | Always "fresh" data | 3× API cost per revisit; surprise bills | Never for file-based analysis |
| `detail: high` on full-res images | Slightly better portion guess | 5–10× token cost; slow UX | Only after client resize |
| `json_object` without strict schema | Faster prompt iteration | Fragile parses; production 500s | Never in production path |
| Skip user edit on Result | Shorter MVP flow | Wrong diary data; user distrust | Never for nutrition domain |
| `multer.memoryStorage()` without limits | Simple upload code | OOM under attack; no streaming | MVP local dev only |
| Hardcoded 2000 kcal daily goal | Quick home screen | Misleading progress for all users | MVP demo if labeled "example goal" |
| Persist full diary forever in localStorage | Simple persistence | QuotaExceededError; slow hydration | MVP with cap + prune |
| Display `confidence` without saving it | UI looks complete | Data loss on save (current bug) | Never |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| OpenAI Vision | Client-side API calls with `VITE_OPENAI_KEY` | Backend proxy only; server env var |
| OpenAI Vision | Sending 4000px+ images at `detail: high` | Resize client-side; then `high` on small image |
| OpenAI Vision | Parsing markdown-wrapped JSON from chat completion | `json_schema` + `strict: true` structured outputs |
| OpenAI Vision | No timeout (default hang) | 30–60s server timeout; return `ApiError` `TIMEOUT` |
| OpenAI Vision | Retrying 400/401 errors | Retry only 429/503 with backoff |
| Multer → OpenAI | Holding 15MB buffer per concurrent request | `fileSize` limit; optional disk/stream; abort on disconnect |
| Axios multipart | Manual `Content-Type: multipart/form-data` | Omit header; let runtime set boundary |
| localStorage (Zustand) | Storing images or unbounded history | Metadata only; prune; try/catch quota |
| TanStack Query | `retry: 2` on all errors | Conditional retry; `staleTime` for immutable analysis |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Uncompressed image upload | Slow POST, high token bill | Client resize to ~1024px | First real mobile photo |
| `staleTime: 0` + revisit `/result` | Duplicate API calls in Network tab | `staleTime: Infinity` or 30s + stable queryKey | Every back-navigation |
| Memory multer on backend | RSS spikes under 10 concurrent uploads | Size limits; concurrency cap | Public deploy / load test |
| Synchronous localStorage on each save | UI jank as diary grows | Debounce persist; cap entries | ~200+ meals or large JSON |
| No abort on client disconnect | OpenAI charges after user left | `AbortController` wired to `req.close` | Impatient mobile users |
| `detail: high` on every request | High $/analyze in dashboard | Resize first; evaluate `auto` vs `high` on resized | >100 analyses/day |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| OpenAI key in client bundle | Unlimited third-party usage; account drain | Server-only key; spending hard limit |
| Open CORS + no rate limit on `/analyze-food` | Anonymous API abuse | Origin allowlist; IP/session rate limit |
| Unbounded file upload | DoS via memory exhaustion | `multer` `fileSize` + MIME allowlist |
| Logging full base64 images | PII in logs; storage cost | Log hash/size only |
| No env validation at backend boot | Silent failure or misconfigured deploy | Fail fast if `OPENAI_API_KEY` missing in prod |
| Trusting model output for allergen safety | User harm if app implies safety | Disclaimers; never "allergen-free" from vision |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Spinner with no time expectation | Abandon during 10s+ analysis | "Analyzing… usually 5–10s" + skeleton UI |
| Exact numbers without uncertainty | False precision; distrust when wrong | Ranges or "estimate" label; editable fields |
| No edit before save | Locked-in wrong diary entries | Confirm/edit screen on Result |
| Generic "Analysis failed" | No idea to retry vs. retake photo | Specific messages + actions per error code |
| Confidence badge implies accuracy | Over-trust in bad estimates | "AI guess" wording; low-confidence highlight |
| Daily goal 2000 kcal for everyone | Irrelevant progress ring | Label as default; defer personalization |
| Data lost on refresh (pre-persist) | "App forgot my meals" | localStorage persist (active requirement) |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **OpenAI integration:** Backend returns real vision output — verify with 5+ diverse meal photos (simple, composite, low light), not just mock.
- [ ] **API key security:** `grep openai apps/mobile` empty; Network tab shows only your backend origin.
- [ ] **Cost control:** Rate limit exists; `staleTime` prevents duplicate analyze; OpenAI spending limit set.
- [ ] **JSON contract:** Structured output validated; malformed responses return typed `ApiError`, not 500 stack trace.
- [ ] **Save path:** `fiber` and `confidence` persisted if displayed (currently dropped in `useSaveMeal`).
- [ ] **Multipart upload:** No manual `Content-Type` header; 5MB+ JPEG succeeds end-to-end.
- [ ] **Diary persistence:** Refresh preserves meals; `QuotaExceededError` handled gracefully.
- [ ] **Error UX:** Toasts fire on save failure and analyze failure (Sonner wired but unused today).
- [ ] **Human confirmation:** User can edit macros/portion before save — not display-only Result page.
- [ ] **Multi-item meals:** Composite plate not collapsed to single generic name without user awareness.
- [ ] **Production env:** `VITE_API_URL` required in prod build; backend CORS not `*` when deployed.

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Leaked API key | MEDIUM | Rotate key immediately; audit usage; add proxy + limits before redeploy |
| Runaway API bill | LOW–MEDIUM | Set hard limit in OpenAI dashboard; add rate limit; fix `staleTime`/retry |
| localStorage quota crash | MEDIUM | Add prune + try/catch; ship migration; users may lose oldest entries |
| Corrupt persist schema | MEDIUM | Bump `version`; `migrate` or reset with user prompt to export |
| Wrong diary data accumulated | LOW | Ship edit/delete meal; `clearDiary()` already exists — expose in UI |
| Fragile JSON parsing in prod | LOW | Deploy strict schema + Zod validation; hotfix prompt/schema |
| Systematic nutrition bias | HIGH | Prompt iteration, user edit UX, optional portion hints — not a quick fix |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls. Phase names are recommendations for roadmap authoring (no ROADMAP.md exists yet).

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| API key exposure | Backend OpenAI Integration | Client bundle scan; no `api.openai.com` in browser network |
| Unprotected proxy / cost runaway | Backend OpenAI Integration | Rate limit returns 429; CORS blocks unknown origins |
| Full-res upload / multipart bug | Client Image Pipeline | POST body <500KB typical; upload works without manual Content-Type |
| Unstructured JSON parsing | AI Analysis Integration | Fuzz tests with malformed fixtures; 0 unhandled parse errors |
| Single-dish schema | AI Analysis Integration | Composite meal photo returns ≥2 items or explicit multi-total |
| Nutrition accuracy / false precision | Result UX & Confirmation | Edit fields exist; disclaimer shown; QA on 10 known meals |
| Missing error UX | Error Handling & User Feedback | 429/503 show retry toast; typed `ApiError` in hooks |
| Analyze race / cache collision | Client Image Pipeline + Result UX | Switch photos mid-flight shows correct result only |
| localStorage quota / schema | Diary Persistence | 500-meal soak test; refresh + corrupt JSON recovery |
| Human-in-the-loop skipped | Result UX & Confirmation | User can change calories before save in E2E test |
| Production security (CORS, env) | Web MVP Release / Deploy | Staging deploy checklist passed |

## Sources

- [OpenAI Images and Vision guide](https://developers.openai.com/api/docs/guides/images-vision) — image limits, `detail` tokenization, payload size (HIGH)
- [OpenAI Production best practices](https://developers.openai.com/api/docs/guides/production-best-practices) — API key handling (HIGH)
- [OpenAI Best Practices for API Key Safety](https://help.openai.com/en/articles/5112595-best-practices-for-api-key) (HIGH)
- [OpenAI Structured Outputs / json_schema](https://developers.openai.com/api/docs/guides/structured-outputs) via Context7 (HIGH)
- AI Food codebase audit: `.planning/codebase/CONCERNS.md`, `apps/mobile/src/features/analyze-food/`, `apps/backend/src/routes/analyze-food.ts` (HIGH)
- Diabettech preprint on LLM vision carb estimation reproducibility — user confirmation non-negotiable, ensemble median (MEDIUM)
- MDPI Nutrients 2026 — AI lipid overestimation, human-in-the-loop for clinical use (MEDIUM)
- ScienceDirect 2025 — contextual metadata reduces nutrition error on complex meals (MEDIUM)
- arXiv 2507.07048 — prompt modifiers (CoT, scale, metadata) for portion estimation (MEDIUM)
- Stack Overflow / BSWEN 2026 — localStorage QuotaExceededError with base64 (HIGH for storage pattern)
- DEV Community — GPT-4o + Pydantic structured outputs for meal tracking (MEDIUM)

---
*Pitfalls research for: AI Food — OpenAI Vision nutrition web MVP*
*Researched: 2026-06-24*
