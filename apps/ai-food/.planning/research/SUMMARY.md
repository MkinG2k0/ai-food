# Project Research Summary

**Project:** AI Food
**Domain:** AI nutrition tracking — photo → КБЖУ → localStorage diary (brownfield React FSD + Express monorepo)
**Researched:** 2026-06-24
**Confidence:** HIGH

## Executive Summary

AI Food — web-first трекер питания в стиле Cal AI / MFP Meal Scan: пользователь загружает фото еды, получает оценку КБЖУ через vision-модель и сохраняет приём в локальный дневник. Проект уже brownfield: FSD-фронтенд, mock-бэкенд Express, Zustand + TanStack Query, shared-types. Ближайший цикл — заменить mock на реальный OpenAI Vision и довести до «показуемого» web-MVP без auth, БД и Capacitor.

Эксперты строят такие продукты по pipeline: **upload → vision identification → portion estimation → nutrition calculation → user review/edit → save → daily aggregation**. Рекомендуемый подход для AI Food: backend proxy (BFF) с `openai@^6.44.0`, `gpt-4o-mini`, Chat Completions + `json_schema` strict, multer memoryStorage, опционально `sharp` для resize. Фронтенд не меняет контракт — `POST /analyze-food` → `AnalyzeFoodResponse`. Критический gap vs текущей реализации: **edit-before-save** (коррекция порции/макросов) — table stakes при переходе с mock на реальный AI, иначе пользователи сохраняют галлюцинации.

Главные риски: (1) vision output ≠ nutritional truth — ±15–30% на сложных блюдах, confidence не гарантирует точность; (2) утечка API key или незащищённый proxy → runaway costs; (3) full-res upload + `staleTime: 0` + retry:2 → 3× billing. Митигация: human-in-the-loop на Result screen, server-only key + rate limit + CORS allowlist, client resize ~1024px, structured outputs + Zod validation, conditional retry.

## Key Findings

### Recommended Stack

Стек минимален и backend-centric: OpenAI SDK только в `apps/backend`, фронтенд без новых AI-зависимостей. Node.js bump до `>=20.9.0` обязателен (`openai@6.x` + `sharp@0.35.x`). Секреты — `OPENAI_API_KEY`, `OPENAI_MODEL` — только server env, никогда `VITE_*`.

**Core technologies:**
- `openai@^6.44.0` — официальный Node SDK для vision + structured JSON на бэкенде
- `gpt-4o-mini` — дешёвая multimodal модель с json_schema; override через `OPENAI_MODEL` при плохой точности
- Chat Completions (`v1/chat/completions`) — base64 `image_url` + `response_format: json_schema strict` → `NutritionResult`
- `multer` memoryStorage (keep) — multipart upload без disk writes
- `sharp@^0.35.2` — resize/orient/HEIC→JPEG перед API call (P2, но сильно снижает cost/latency)
- `zod@^3.24.x` — runtime validation AI JSON после parse (recommended)
- Frontend as-is: `axios`, TanStack Query, browser FormData — контракт не меняется

### Expected Features

~80% table stakes уже реализовано (upload, loading UI, nutrition display, diary, navigation). Два P1-gap блокируют showable MVP с реальным AI.

**Must have (table stakes):**
- Photo upload + preview — ✅ done
- AI analysis с loading state — ✅ UI; ❌ real Vision pending
- КБЖУ display (cal, P/C/F, fiber, confidence) — ✅ done
- **Edit/adjust before save** (scale 0.5×–2× или inline edit) — ❌ critical gap
- Confirm + save to diary — ✅ done (без edit)
- Daily calorie summary + meal history — ✅ done
- localStorage persistence — ✅ architecturally; verify E2E
- **Structured error feedback** (toast + inline, typed ApiError) — ⚠️ partial

**Should have (competitive):**
- Photo-first без database search — ✅ architectural differentiator
- Confidence badge + honest «estimate» copy — ✅ UI; needs real model field
- Backend proxy для API key — ❌ pending (enabler)
- Client image compression — P2, prevents cost/latency blowout

**Defer (v2+):**
- RAG + USDA/FNDDS, food database search, multi-item decomposition, barcode/voice, auth + cloud sync, Capacitor, premium/paywall, AI coach, micronutrients beyond fiber

### Architecture Approach

Сохранить FSD + backend proxy: mobile POST FormData → Express route (thin) → `analyze-food.service` (OpenAI, prompts, parse) → `AnalyzeFoodResponse`. TanStack Query владеет server state; Zustand — image + diary (persist). Новые backend-модули: `openai-client.ts`, `nutrition-schema.ts`, `prompts/nutrition.ts`, `parse-nutrition.ts`, `errors.ts`. Контракт `packages/shared-types` — единая граница mobile ↔ backend.

**Major components:**
1. `features/analyze-food` — TanStack Query hook, FormData POST; без OpenAI awareness
2. `apps/backend/services/` — OpenAI orchestration, prompt, parse/validate
3. `entities/meal/useDiaryStore` — persist `Meal[]` в localStorage (`ai-food-diary`)
4. `shared/api` — Axios + ApiError interceptor → toast/inline UX
5. `features/save-meal` + Result UX — map `NutritionResult` → `Meal` после user confirmation

### Critical Pitfalls

1. **Vision output as ground truth** — позиционировать как estimate; edit-before-save + confidence как soft signal, не гарантия
2. **API key exposure / client-side OpenAI** — key только в backend; grep mobile на `openai`; spending limit в dashboard
3. **Unprotected proxy → runaway costs** — rate limit, CORS allowlist, `staleTime` для immutable analysis, resize before API, abort on disconnect
4. **Fragile JSON parsing** — `json_schema strict` + Zod; не `json_object` без schema; persist fiber/confidence в save path
5. **Full-res upload + wrong query cache** — client resize ~1024px; fix manual Content-Type on FormData; `imageId` UUID in queryKey; cancel in-flight on new pick

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Backend OpenAI Foundation
**Rationale:** Security constraint и все downstream features зависят от working proxy; mock replacement блокирует E2E validation.
**Delivers:** `openai-client`, env config (`.env.example`), `OPENAI_API_KEY` fail-fast, Node 20 bump, package install
**Addresses:** Backend proxy (P1 enabler), Real Vision analysis (start)
**Avoids:** API key exposure (Pitfall 2), SERVICE_MISCONFIGURED in prod

### Phase 2: AI Analysis Integration
**Rationale:** Core value — замена mock на real vision; schema/prompt decisions lock API contract.
**Delivers:** `nutrition-schema.ts`, `prompts/nutrition.ts`, `parse-nutrition.ts`, `analyze-food.service.ts`, route refactor (mock → live), structured `ApiError` codes
**Addresses:** Real OpenAI Vision analysis (P1), Nutrition display with real confidence
**Avoids:** Fragile JSON parsing (Pitfall 4), unstructured output; decide single-dish vs multi-item schema here (Pitfall 5 — MVP: one `foodName` + totals, prompt hints for composite)

### Phase 3: Client Image Pipeline & Query Hardening
**Rationale:** Cost/latency и race conditions проявляются только с real API; fix до public deploy.
**Delivers:** Client resize/compress, remove manual multipart Content-Type, `imageId` in queryKey, `staleTime`/`retry` policy, optional backend `sharp` + multer limits
**Addresses:** Image compression (P2), stable analyze flow
**Avoids:** Full-res cost blowout (Pitfall 6), analyze race/cache collision (Pitfall 9), duplicate API calls (Pitfall 3)

### Phase 4: Result UX & Human Confirmation
**Rationale:** Table stakes с real AI; без edit flow продукт «looks done but isn't».
**Delivers:** Portion scale (0.5×–2×) or inline macro edit on ResultPage, disclaimer copy, persist fiber/confidence in `useSaveMeal`, fix `'1 serving'` hardcode
**Addresses:** Edit before save (P1), Confirm + save with user trust
**Avoids:** Nutrition accuracy false precision (Pitfall 1), human-in-the-loop skipped (Pitfall 10)

### Phase 5: Error Handling & Diary Persistence
**Rationale:** Showable MVP требует понятных ошибок и надёжного persist; можно частично параллелить с Phase 3–4.
**Delivers:** Sonner toasts wired, `useQuery<..., ApiError>` typing, per-code user messages + retry CTA, persist version/migrate, quota prune, E2E verify refresh
**Addresses:** Structured error feedback (P1), localStorage persistence verify (P1)
**Avoids:** Missing error UX (Pitfall 8), localStorage quota crash (Pitfall 7)

### Phase 6: Web MVP Release
**Rationale:** Production hardening после happy path works locally.
**Delivers:** CORS allowlist, rate limit on `/analyze-food`, `VITE_API_URL` prod config, health check with key validation, `ANALYZE_FOOD_MOCK` for CI, manual QA checklist (5+ diverse photos)
**Addresses:** «Можно показать пользователям»
**Avoids:** Open CORS abuse (Pitfall 3), production env gaps (PITFALLS checklist)

### Phase Ordering Rationale

- **Backend before frontend AI changes:** API key security non-negotiable; contract frozen lets parallel frontend work after Phase 2.
- **Image pipeline before public deploy, after backend works:** mock hid upload bugs; real API exposes cost immediately.
- **Edit UX after real AI returns data:** edit is meaningless on mock; essential once variance visible.
- **Error/persist hardening grouped:** both are «showable quality» gates, low coupling to AI logic.
- **Deploy last:** rate limit/CORS only matter when backend is public.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (AI Analysis):** Prompt engineering iteration, single-dish vs multi-item schema tradeoff, `detail: high` vs `low` on resized images — needs `/gsd-research-phase` if accuracy QA fails on composite meals
- **Phase 4 (Result UX):** Portion scale UX patterns (Cal AI slider vs inline edit) — light UX research if design undecided

Phases with standard patterns (skip research-phase):
- **Phase 1 (Backend Foundation):** Official OpenAI SDK + Express proxy — well-documented
- **Phase 3 (Image Pipeline):** Canvas resize + multer limits — established web patterns
- **Phase 5 (Error/Persist):** Zustand persist + Sonner + ApiError — already in codebase
- **Phase 6 (Deploy):** Render/Railway/Fly + Vite static — standard

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | npm versions, OpenAI docs, existing codebase verified |
| Features | HIGH | Competitor analysis + codebase audit; MEDIUM on exact Vision accuracy magnitudes |
| Architecture | HIGH | Brownfield patterns mapped; FSD boundaries clear |
| Pitfalls | HIGH (security/API); MEDIUM (nutrition accuracy magnitudes) | Peer-reviewed on vision bias; model-version dependent |

**Overall confidence:** HIGH

### Gaps to Address

- **Vision accuracy on composite meals:** MVP accepts single-item schema + user edit; validate with 10 known meals in Phase 2 QA — escalate to multi-item schema in v1.x if blocker
- **PROJECT.md says diary «only in memory»:** Codebase has `persist` — reconcile during Phase 5 E2E verify
- **`fiber`/`confidence` dropped on save:** Confirm in Phase 4 when extending save path
- **Multi-item decomposition:** Explicitly deferred; prompt should warn on composite plates, not silently collapse
- **RAG/USDA grounding:** Out of scope MVP; document as v2 accuracy path if PMF + accuracy complaints

## Sources

### Primary (HIGH confidence)
- Context7 `/websites/developers_openai_api` — vision input, structured outputs, Chat Completions
- Context7 `/expressjs/multer` — memoryStorage, limits
- [OpenAI Images and Vision guide](https://platform.openai.com/docs/guides/images-vision) — formats, detail levels
- [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) — json_schema strict
- [npm openai@6.44.0](https://www.npmjs.com/package/openai), [sharp@0.35.2](https://www.npmjs.com/package/sharp)
- AI Food codebase: `.planning/codebase/`, `apps/backend`, `apps/mobile`, `.planning/PROJECT.md`

### Secondary (MEDIUM confidence)
- [MyFitnessPal Meal Scan FAQ](https://support.myfitnesspal.com/hc/en-us/articles/360045761612-Meal-Scan-FAQ) — competitor edit flow
- [DietAI24 / Nature Communications Medicine 2025](https://www.nature.com/articles/s43856-025-01159-0) — vision hallucinates nutrition; RAG for accuracy
- [Cal AI](https://www.calai.app/), SnapCalorie — photo-first positioning
- MDPI Nutrients 2026, arXiv 2507.07048 — portion estimation bias, CoT prompting

### Tertiary (LOW confidence)
- Exact ±% error rates per food type on `gpt-4o-mini` — needs product-specific QA, not literature alone

---
*Research completed: 2026-06-24*
*Ready for roadmap: yes*
