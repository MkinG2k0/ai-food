# Optional Auth + Free Quota Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Guest device-id quota (50 analyze+refine) on `ai-app` with Telegram JWT unlock; Settings remaining in `ai-food`.

**Architecture:** Prisma/Postgres on gateway; Telegram Login Widget HMAC → JWT (`X-User-Token`); billable chat gated by `X-Device-Id` + `X-Usage-Kind`; Capacitor Preferences device UUID on client.

**Tech Stack:** Express, Prisma, PostgreSQL, jose (JWT), Vitest/Supertest; React/Vite/Capacitor on ai-food.

**Spec:** `docs/superpowers/specs/2026-08-04-optional-auth-quota-design.md`

## Global Constraints

- Keep existing `API_KEY` / `Authorization: Bearer` gateway auth unchanged
- User session header: `X-User-Token` (never overwrite API_KEY Bearer)
- Billable kinds only: `analyze` | `refine`; missing kind = `other` (no quota)
- `FREE_GENERATION_LIMIT` default 50; login → unlimited until subscription
- No `@auth/express` / next-auth in this phase
- Bot token never in `VITE_*`

## File map

### ai-app
- Create: `prisma/schema.prisma`
- Create: `src/lib/prisma.ts`, `src/lib/telegramAuth.ts`, `src/lib/jwt.ts`, `src/lib/quota.ts`
- Create: `src/routes/auth.ts`, `src/routes/usage.ts`
- Create: `src/middleware/quota.ts`
- Modify: `src/app.ts`, `package.json`, `.env.example`
- Test: `src/lib/telegramAuth.test.ts`, `src/lib/quota.test.ts`, `src/routes/auth.test.ts`, `src/middleware/quota.test.ts`

### ai-food
- Create: `src/shared/lib/deviceId.ts` (+ test)
- Modify: analyze/refine API clients for headers
- Modify: auth store for JWT; Settings usage display; Login Telegram widget path
- Modify: `.env.example`

---

### Task 1: Prisma schema + client bootstrap (ai-app)

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/prisma.ts`
- Modify: `package.json` (deps + scripts)
- Modify: `.env.example`

**Produces:** `prisma` singleton; models User/Device/UsageEvent; scripts `prisma:generate`, `prisma:migrate`

- [ ] **Step 1:** Add deps `prisma`, `@prisma/client`, `jose`; scripts; write schema per spec; `src/lib/prisma.ts` lazy client; env stubs `DATABASE_URL`, `AUTH_SECRET`, `TELEGRAM_BOT_TOKEN`, `FREE_GENERATION_LIMIT=50`, `QUOTA_ENFORCE`
- [ ] **Step 2:** `npx prisma generate` (migrate deferred until user has DATABASE_URL — commit schema only)
- [ ] **Step 3:** Commit `feat(auth): add Prisma schema for users devices usage`

---

### Task 2: Telegram verify + JWT helpers

**Files:**
- Create: `src/lib/telegramAuth.ts`, `src/lib/telegramAuth.test.ts`
- Create: `src/lib/jwt.ts`, `src/lib/jwt.test.ts`

**Produces:** `verifyTelegramLogin(data, botToken)`, `signUserToken(payload)`, `verifyUserToken(token)`

- [ ] **Step 1:** TDD Telegram HMAC (fixture from Telegram docs style) + JWT roundtrip
- [ ] **Step 2:** Commit `feat(auth): telegram hash verify and user JWT`

---

### Task 3: Quota helpers

**Files:**
- Create: `src/lib/quota.ts`, `src/lib/quota.test.ts`

**Produces:** `getFreeLimit()`, `countGuestUsage(deviceRowId)`, `assertGuestAllowed`, `recordUsage`

- [ ] **Step 1:** Unit tests with mocked Prisma
- [ ] **Step 2:** Commit `feat(auth): guest quota counting helpers`

---

### Task 4: Auth + usage routes

**Files:**
- Create: `src/routes/auth.ts`, `src/routes/usage.ts`, tests
- Modify: `src/app.ts` — mount `/auth`, `/usage` **outside** `requireApiKey`; CORS allow `X-Device-Id`, `X-User-Token`, `X-Usage-Kind`

- [ ] **Step 1:** `POST /auth/telegram`, `GET /auth/me`, `GET /usage`
- [ ] **Step 2:** Supertest with mocked prisma or test DB
- [ ] **Step 3:** Commit `feat(auth): telegram login and usage endpoints`

---

### Task 5: Chat quota middleware

**Files:**
- Create: `src/middleware/quota.ts` (+ test)
- Modify: `src/app.ts` — apply on `/v1/chat/completions` after API key

- [ ] **Step 1:** Enforce headers + 402 QUOTA_EXCEEDED; skip when authenticated; skip `other`; soft-skip when no DATABASE_URL unless `QUOTA_ENFORCE=true`
- [ ] **Step 2:** Commit `feat(auth): enforce free generation quota on chat`

---

### Task 6: ai-food device id + AI headers

**Files:**
- Create: `src/shared/lib/deviceId.ts` (+ test)
- Modify: analyze/refine stream/API modules
- Export from `src/shared/lib/index.ts`

- [ ] **Step 1:** Capacitor Preferences UUID; send `X-Device-Id`, `X-Usage-Kind`, optional `X-User-Token`
- [ ] **Step 2:** Commit in ai-food repo

---

### Task 7: ai-food auth JWT + Settings remaining + login bridge

**Files:**
- Modify: `src/features/auth/*`, Settings, LoginPage
- Add: `fetchUsage` API helper

- [ ] **Step 1:** Persist `userToken`; Settings shows remaining; real Telegram POST when not mock; handle 402
- [ ] **Step 2:** Commit

---

## Spec coverage

| Spec item | Task |
|-----------|------|
| Prisma models | 1 |
| Telegram HMAC + JWT | 2 |
| Guest 50 analyze/refine | 3, 5 |
| Auth endpoints + /usage | 4 |
| Chat middleware + headers | 5 |
| Capacitor device id | 6 |
| Settings remaining + login unlock | 7 |
| API_KEY unchanged | 4–5 |
| Subscription stub field | 1 |

## Execution

Inline in this session: Tasks 1→5 (ai-app), then 6→7 (ai-food).
