---
phase: quick-260803-wue
plan: 01
subsystem: auth
tags: [telegram, auth-js-shape, zustand, mock, login, settings]

requires: []
provides:
  - Client mock Telegram session (Auth.js-shaped API)
  - /login page with demo sign-in
  - Settings account block (avatar / Войти / Выйти)
affects: [future Auth.js Telegram Login Widget integration]

tech-stack:
  added: []
  patterns:
    - Zustand persist session via capacitorStorage (key ai-food-auth)
    - Thin Auth.js-shaped helpers (signInWithMockTelegram / signOut / isAuthMockEnabled)
    - Optional auth route without ProfileGuard

key-files:
  created:
    - src/features/auth/model/telegramSession.ts
    - src/features/auth/model/useAuthStore.ts
    - src/features/auth/model/useAuthStore.test.ts
    - src/features/auth/model/mockTelegramAuth.ts
    - src/features/auth/index.ts
    - src/pages/login/ui/LoginPage.tsx
    - src/pages/login/index.ts
    - .env.example
  modified:
    - src/app/router.tsx
    - src/pages/settings/ui/SettingsPage.tsx

key-decisions:
  - "D-07: no next-auth/@auth packages — client mock only"
  - "Persist key ai-food-auth with capacitorStorage"
  - "/login outside ProfileGuard; auth remains optional"
  - "VITE_AUTH_MOCK unset/true enables mock; false disables with UI hint"

patterns-established:
  - "features/auth barrel exports store + mock helpers + TelegramSession"
  - "Settings support Telegram (@double_cumboy) stays separate from account auth"

requirements-completed: [QUICK-260803-wue]

coverage:
  - id: D1
    description: Auth store persists Telegram-shaped session; mock sign-in/out; VITE_AUTH_MOCK gate
    requirement: QUICK-260803-wue
    verification:
      - kind: unit
        ref: src/features/auth/model/useAuthStore.test.ts
        status: pass
    human_judgment: false
  - id: D2
    description: /login mock sign-in redirects to home; route optional (no auth guard)
    requirement: QUICK-260803-wue
    verification:
      - kind: other
        ref: pnpm exec tsc --noEmit
        status: pass
    human_judgment: true
    rationale: Redirect and guest-flow smoke need manual browser check
  - id: D3
    description: Settings Аккаунт shows avatar/name + Выйти or Войти → /login; support link untouched
    requirement: QUICK-260803-wue
    verification:
      - kind: other
        ref: pnpm exec tsc --noEmit
        status: pass
    human_judgment: true
    rationale: Visual account block vs support Telegram row needs UI confirmation

duration: 5min
completed: 2026-08-03
status: complete
---

# Phase quick-260803-wue Plan 01: Telegram auth mock Summary

**Client-side Auth.js-shaped Telegram mock: Zustand session, `/login` demo sign-in, Settings account UI — no next-auth, no backend.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-08-03T20:54:42Z
- **Completed:** 2026-08-03T20:58:32Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- `features/auth` with `TelegramSession`, persisted `useAuthStore` (`ai-food-auth`), and mock helpers matching future Auth.js shape
- `/login` page (SubpageShell) with demo button, widget placeholder, redirect to `/` after mock sign-in; route without ProfileGuard
- Settings «Аккаунт»: avatar/name + «Выйти» or «Войти» → `/login`; `@double_cumboy` support row unchanged
- `.env.example` stubs for `VITE_TELEGRAM_BOT_USERNAME` and `VITE_AUTH_MOCK`

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 (RED) | `fb97749` | test(quick-260803-wue-01): add failing test for auth store |
| 1 (GREEN) | `12752f5` | feat(quick-260803-wue-01): implement auth store and mock Telegram API |
| 2 | `5521fa0` | feat(quick-260803-wue-01): add login page and /login route |
| 3 | `7e42e0c` | feat(quick-260803-wue-01): add Settings account block with logout |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

- Mock session only — no server verification (intentional; T-wue-01 accept)
- Telegram Login Widget placeholder UI — no real widget script (D-06 / D-07)
- `VITE_TELEGRAM_BOT_USERNAME` stub empty in `.env.example`

## Threat Flags

None beyond plan threat_model (mock session, local storage).

## Verification

- `pnpm exec vitest run src/features/auth/model/useAuthStore.test.ts` — 9 passed
- `pnpm exec tsc --noEmit` — passed

## Self-Check: PASSED

- FOUND: src/features/auth/model/useAuthStore.ts
- FOUND: src/features/auth/model/mockTelegramAuth.ts
- FOUND: src/features/auth/index.ts
- FOUND: src/pages/login/ui/LoginPage.tsx
- FOUND: src/pages/login/index.ts
- FOUND: .env.example
- FOUND: fb97749, 12752f5, 5521fa0, 7e42e0c
