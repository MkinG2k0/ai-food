---
phase: 260813-rut
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - docs/USER-DATA-SYNC.md
  - docs/AI-GATEWAY.md
autonomous: true
requirements:
  - QUICK-260813-rut
estimate:
  tokens: 25000
  raw_tokens: 25000
  tasks: 2
  confidence: low
must_haves:
  truths:
    - "В docs/ есть design doc с inventory local vs server (as-of audit)"
    - "Gap list приоритезирован: P0 diary, P1 weight/favorites, P2 settings, P3 images"
    - "Для P0 diary есть sketch Prisma model + API (CRUD или bulk) с auth X-User-Token"
    - "Рекомендована conflict strategy (LWW vs merge) для multi-device"
    - "Явно перечислено что остаётся client-only и почему"
    - "Phased rollout: profile done → diary next → …"
    - "Explicit out-of-scope: никакого кода sync endpoints / Prisma Meal в этом quick task"
  artifacts:
    - path: docs/USER-DATA-SYNC.md
      provides: "Server-side user data persistence design (inventory, gaps, P0 sketch, conflicts, rollout)"
    - path: docs/AI-GATEWAY.md
      provides: "See-also link to USER-DATA-SYNC.md"
  key_links:
    - from: User.nutritionProfile Json
      to: PUT /auth/profile (X-User-Token)
      via: "putNutritionProfile + syncNutritionProfileToServer (already synced)"
    - from: ai-food-diary meals[]
      to: proposed Meal (Prisma) + /user/meals*
      via: "P0 diary sync design only — no implementation this task"
    - from: Capacitor Filesystem imageUri(s)
      to: P3 image strategy
      via: "design note; photos stay local until later phase"
---

<objective>
Спроектировать server-side persistence пользовательских данных (дневник, избранное, вес, настройки, фото) — **только design doc**, без реализации sync API.

Purpose: Зафиксировать inventory / gaps / P0 diary sketch / conflict strategy / rollout, чтобы следующий implementation quick/phase не начинал с нуля. Мотивация — cross-device restore после Telegram login; diary/manual/barcode остаются free forever (SUBSCRIPTION.md).

Output: `docs/USER-DATA-SYNC.md` (+ краткая ссылка из `docs/AI-GATEWAY.md`). STATE.md decision note **не** трогать в этом плане (оставит orchestrator Step 7).
</objective>

<execution_context>
@$HOME/.cursor/gsd-core/workflows/execute-plan.md
@$HOME/.cursor/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@docs/SUBSCRIPTION.md
@docs/AI-GATEWAY.md
@../ai-app/prisma/schema.prisma
@src/features/auth/api/putNutritionProfile.ts
@src/features/auth/model/nutritionProfile.ts
@src/features/onboarding/model/syncNutritionProfileToServer.ts
@src/shared/types/index.ts
@src/entities/meal/model/useDiaryStore.ts
@src/features/favorites/model/useFavoritesStore.ts
@src/features/stats/model/useWeightStore.ts
@src/features/settings/model/useSettingsStore.ts

## Pre-researched audit (USE AS-IS — do not reinvent)

### Client-only (Capacitor Preferences / Zustand persist) — NOT on server
| Store key | Data |
|-----------|------|
| `ai-food-diary` | meals[] (KBJU, items, portions, grams, imageUri(s), micronutrients, healthiness, status, timestamps) |
| `ai-food-favorites` | favorites[] (max 50, includes image refs) |
| `ai-food-weight` | weight entries[] + goalKg |
| `ai-food-settings` | customInstructions, feature flags, aiModel, calendarRings |
| `ai-food-auth` | session token locally (server has User) |
| `ai-food-model-test` | model test UI state (dev) |
| deviceId | X-Device-Id |
| meal images | Capacitor Filesystem (local URIs) |
| usage cache | `ai-food-usage` localStorage snapshot of quota |

### Already on server (Postgres / Prisma `apps/ai-app`)
User (telegramId, names, photo, consent, **nutritionProfile Json**, subscription*), Device, UsageEvent, Payment / PromoCode / AppSettings, GatewayRequest.

### Already synced
Auth → User; nutritionProfile via PUT `/auth/profile` + GET me (`X-User-Token`); usage/quota + billing; guest→user device linking.

### NOT synced (gaps)
1. Diary meals 2. Favorites 3. Weight history 4. Settings 5. Meal photos 6. micronutrientTargets on profile store (NutritionProfilePayload = profile+targets only — confirm in Task 2).

## Constraints
- Docs/design only. **Do not** add Prisma Meal/Favorite models, migrations, or sync routes in `apps/ai-app`.
- Mirror tone/structure of existing docs (`SUBSCRIPTION.md`, `AI-GATEWAY.md`): Russian OK, tables, last-updated date.
- Auth pattern to reference: `X-User-Token` like `putNutritionProfile`.
- Free forever: diary, manual, barcode, stats, onboarding, settings — sync must not gate behind subscription.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Write USER-DATA-SYNC.md design doc</name>
  <files>docs/USER-DATA-SYNC.md</files>
  <read_first>
    apps/ai-app/prisma/schema.prisma (User.nutritionProfile Json — no Meal model yet);
    apps/ai-food/docs/SUBSCRIPTION.md (free forever vs paid AI);
    apps/ai-food/docs/AI-GATEWAY.md (auth headers, monorepo split);
    apps/ai-food/src/features/auth/api/putNutritionProfile.ts (X-User-Token PUT pattern);
    apps/ai-food/src/shared/types/index.ts (Meal fields for P0 payload sketch)
  </read_first>
  <action>
    Create `apps/ai-food/docs/USER-DATA-SYNC.md` as the single design source for server-side user data. Use the pre-researched audit tables from plan context (copy/adapt — do not re-audit the whole codebase). Document must include all of the following sections:

    1. **Inventory** — table local vs server as-of this audit (client keys + server Prisma models).
    2. **Gaps (prioritized)** — P0 diary meals; P1 weight history + favorites; P2 settings (customInstructions / UI prefs / model override); P3 meal photos; note micronutrientTargets gap vs `NutritionProfilePayload` (profile+targets only).
    3. **P0 diary sync sketch** — proposed Prisma `Meal` (or equivalent) fields mapped from client `Meal` type; API sketch under gateway with `X-User-Token` (prefer either REST CRUD `/user/meals` or bulk sync `/user/meals/sync` — pick one primary recommendation and briefly justify); note soft-delete / updatedAt if recommending LWW; images as optional URL/null stubs (full blob upload = P3).
    4. **Conflict strategy** — recommend LWW vs field-merge for multi-device; default recommendation should favor LWW on `updatedAt`/`clientUpdatedAt` for meals (simpler, matches offline-first), with a short note when merge would matter (e.g. concurrent item edits).
    5. **Stays client-only** — selectedDate ephemeral; `ai-food-model-test`; deviceId generation; usage cache snapshot; argue whether `aiModel` override stays client or becomes server-controlled later; session token stays local (server has User).
    6. **Phased rollout** — Phase A profile (done) → Phase B diary P0 → Phase C weight/favorites → Phase D settings → Phase E images; each phase outcome one sentence.
    7. **Out of scope for this quick task** — no Prisma migrations, no Express routes, no client sync hooks in this delivery; implementation is a future quick/phase after this doc is approved.

    Style: match `SUBSCRIPTION.md` / `AI-GATEWAY.md` (title, last-updated 2026-08-13, tables). Mention monorepo split: design lives in ai-food/docs; implementation later in ai-app + ai-food client.
  </action>
  <verify>
    <automated>test -f apps/ai-food/docs/USER-DATA-SYNC.md &amp;&amp; rg -n "Inventory|P0|LWW|client-only|Out of scope|phased|Phase" apps/ai-food/docs/USER-DATA-SYNC.md</automated>
  </verify>
  <done>
    USER-DATA-SYNC.md exists with inventory, prioritized gaps, P0 Prisma/API sketch, conflict recommendation, client-only list, phased rollout, and explicit out-of-scope (no sync code).
  </done>
</task>

<task type="auto">
  <name>Task 2: Spot-check micronutrientTargets gap + link from AI-GATEWAY</name>
  <files>docs/USER-DATA-SYNC.md, docs/AI-GATEWAY.md</files>
  <read_first>
    apps/ai-food/src/features/auth/model/nutritionProfile.ts (NutritionProfilePayload shape);
    apps/ai-food/src/features/onboarding/model/useProfileStore.ts (or wherever micronutrientTargets live);
    apps/ai-food/docs/USER-DATA-SYNC.md (from Task 1);
    apps/ai-food/docs/AI-GATEWAY.md (see-also section pattern)
  </read_first>
  <action>
    Confirm whether `micronutrientTargets` is persisted only in the local profile store and omitted from `NutritionProfilePayload` / `User.nutritionProfile`. Update the gaps section of USER-DATA-SYNC.md if the Task 1 wording was imprecise (cite the exact client field names).

    Add a short «См. также» bullet or sentence in `docs/AI-GATEWAY.md` pointing to `USER-DATA-SYNC.md` (user data inventory / future diary sync design — not implemented). Do not expand AI-GATEWAY into a second design doc.

    Hard constraint: still no Prisma model code, no new routes, no client sync implementation.
  </action>
  <verify>
    <automated>rg -n "USER-DATA-SYNC|micronutrientTargets" apps/ai-food/docs/USER-DATA-SYNC.md apps/ai-food/docs/AI-GATEWAY.md</automated>
  </verify>
  <done>
    micronutrientTargets gap accurately reflected; AI-GATEWAY.md links to USER-DATA-SYNC.md; no sync implementation files added.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Client stores → future sync API | Untrusted device pushes meal/weight/settings payloads; must be bound to authenticated User via X-User-Token |
| Design doc → future implementers | Doc recommendations become API contract; over-broad sync could leak PII/photos |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-260813-rut-01 | Information Disclosure | Future meal sync payloads | medium | mitigate | Doc must require X-User-Token user scoping; no anonymous diary sync; photos P3 with explicit consent note |
| T-260813-rut-02 | Tampering | Multi-device LWW | medium | mitigate | Recommend server-side userId ownership checks + monotonic updatedAt; reject writes for other users |
| T-260813-rut-03 | Elevation of Privilege | Settings/aiModel sync | low | accept | Doc marks aiModel as discretionary / possibly client-only; paid AI still gated by existing quota/subscription |
| T-260813-rut-SC | Tampering | npm installs | low | accept | No new packages in this docs-only task |
</threat_model>

<verification>
- `docs/USER-DATA-SYNC.md` present and covers all seven required content areas.
- `docs/AI-GATEWAY.md` references USER-DATA-SYNC.md.
- `git status` / `rg` show no new Prisma models or `/user/meals` route implementations under apps/ai-app.
</verification>

<success_criteria>
Design-ready doc answers: what is local vs server today, what to sync first (diary), how (API+Prisma sketch), how to resolve conflicts, what never syncs, and the rollout order — without shipping sync code.
</success_criteria>

<output>
Create `.planning/quick/260813-rut-design-server-side-user-data-persistence/260813-rut-01-SUMMARY.md` when done
</output>
