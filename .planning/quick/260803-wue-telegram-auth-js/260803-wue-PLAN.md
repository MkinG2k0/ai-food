---
phase: quick-260803-wue
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/features/auth/model/telegramSession.ts
  - src/features/auth/model/useAuthStore.ts
  - src/features/auth/model/useAuthStore.test.ts
  - src/features/auth/model/mockTelegramAuth.ts
  - src/features/auth/index.ts
  - .env.example
  - src/pages/login/ui/LoginPage.tsx
  - src/pages/login/index.ts
  - src/app/router.tsx
  - src/pages/settings/ui/SettingsPage.tsx
autonomous: true
requirements:
  - QUICK-260803-wue
user_setup: []

must_haves:
  truths:
    - "Пользователь открывает /login и входит mock-кнопкой без обязательного логина в остальном приложении"
    - "После mock-входа редирект на Home /; сессия с id, name, username, photo_url переживает перезагрузку"
    - "В Settings при сессии видны аватар/имя и «Выйти»; без сессии — ссылка «Войти» на /login"
    - "Существующая ссылка Telegram @double_cumboy в «О приложении» не меняет смысл (канал поддержки, не auth)"
  artifacts:
    - src/features/auth/model/useAuthStore.ts
    - src/features/auth/model/mockTelegramAuth.ts
    - src/features/auth/index.ts
    - src/pages/login/ui/LoginPage.tsx
    - src/pages/login/index.ts
  key_links:
    - "LoginPage mock button → signInWithMockTelegram → useAuthStore.session → navigate('/')"
    - "Settings account block → useAuthStore selectors → /login or signOut"
    - "router /login outside ProfileGuard (optional auth, D-02)"
---

<objective>
Клиентский mock-слой входа через Telegram в форме, совместимой с будущим Auth.js: Zustand persist session, страница `/login`, блок аккаунта в Settings — без бэкенда и без установки next-auth.

Purpose: Подготовить UX и контракт сессии под будущий Telegram Login Widget / Auth.js, не ломая текущий guest-flow.

Output: `features/auth` + `pages/login` + route `/login` + Settings account UI + `.env.example` stubs.
</objective>

<execution_context>
@$HOME/.cursor/gsd-core/workflows/execute-plan.md
@$HOME/.cursor/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/PROJECT.md
@.planning/quick/260803-wue-telegram-auth-js/260803-wue-CONTEXT.md
@src/features/onboarding/model/useProfileStore.ts
@src/features/onboarding/index.ts
@src/features/favorites/model/useFavoritesStore.test.ts
@src/app/router.tsx
@src/pages/settings/ui/SettingsPage.tsx
@src/pages/manual-entry/ui/ManualEntryPage.tsx

## Locked decisions (honor exactly)

- **D-01 Screen:** Отдельная страница `/login` с mock-кнопкой входа; визуально оставить место/комментарий под будущий Telegram Login Widget (domain `ai-food-mobile.vercel.app`, D-06).
- **D-02 Optional:** Логин не обязателен — никаких auth-guard на маршрутах; приложение как сейчас работает без сессии.
- **D-03 Redirect:** После успешного mock-входа → `navigate('/', { replace: true })`.
- **D-04 Session shape:** Поля сессии минимум `id`, `name`, `username`, `photo_url` (Auth.js/Telegram-совместимо); опционально `telegramId` если удобно зеркалить numeric id.
- **D-05 Logout:** Кнопка «Выйти» в Settings.
- **D-06 Domain / bot:** Domain Login Widget уже `ai-food-mobile.vercel.app`; реального bot token/username нет — только моки; не внедрять OIDC в этой задаче.
- **D-07 No next-auth:** Не устанавливать `next-auth` / `@auth/*`. Тонкий mock-слой с API-shape под будущий Auth.js (`signIn` / `signOut` / session).
- **D-08 FSD:** Feature `auth`; Zustand `persist` для session (клиентское UI-состояние, не server cache).
- **D-09 Settings UI:** Если залогинен — аватар + имя; иначе ссылка/кнопка «Войти» → `/login`. Не путать с существующей ссылкой `t.me/double_cumboy` в секции «О приложении» (канал поддержки).
- **D-10 Env stubs:** `VITE_TELEGRAM_BOT_USERNAME`, `VITE_AUTH_MOCK=true` в `.env.example` (создать файл, если отсутствует).

## Discretion

- Имя фичи: `auth` (не `telegram-auth`).
- Persist key: `ai-food-auth`; storage: `createJSONStorage(() => capacitorStorage)` как в `useProfileStore`.
- Mock user: стабильные русскоязычные/нейтральные значения (например name «Telegram User», username `telegram_user`, placeholder photo_url — data-URI или публичный placeholder avatar URL).
- `VITE_AUTH_MOCK` при отсутствии считать mock-режимом включённым (default true для текущего этапа); если явно `false` — кнопка mock disabled с пояснением, что реальный виджет ещё не подключён.
- UI strings на русском.
- Login route внутри `AppShell`, **без** `ProfileGuard` (как `/onboarding`), чтобы вход был доступен независимо от профиля; остальные маршруты не трогать.

## Patterns

- FSD: реализация в `features/auth/{model,ui?}`; public API только через `src/features/auth/index.ts`
- Pages: `src/pages/login/ui/LoginPage.tsx` + barrel `src/pages/login/index.ts`; named export `LoginPage`
- Cross-slice imports только через barrels (`@/features/auth`)
- Co-located Vitest для store; mock `@capacitor/preferences` как в `useFavoritesStore.test.ts`
- 2-space indent, single quotes, Russian UI
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Auth feature — session store + mock Auth.js-shaped API</name>
  <files>src/features/auth/model/telegramSession.ts, src/features/auth/model/useAuthStore.ts, src/features/auth/model/useAuthStore.test.ts, src/features/auth/model/mockTelegramAuth.ts, src/features/auth/index.ts, .env.example</files>
  <behavior>
    - Initial session is null; isAuthenticated false when session is null
    - signInWithMockTelegram sets session with id, name, username, photo_url (and optional telegramId)
    - signOut clears session to null
    - Persist name is ai-food-auth
    - isAuthMockEnabled reflects VITE_AUTH_MOCK (missing/true → enabled; string false → disabled)
  </behavior>
  <action>
    1. Per D-04/D-07/D-08: create `TelegramSession` interface (`id`, `name`, `username`, `photo_url`, optional `telegramId`) in `telegramSession.ts`. Do not add next-auth packages.
    2. Create `useAuthStore` with `session: TelegramSession | null`, `signIn(session)`, `signOut()`, helper `isAuthenticated` via selector or method. Persist with capacitorStorage, name `ai-food-auth`.
    3. Create `mockTelegramAuth.ts`: `signInWithMockTelegram()` builds a fixed mock `TelegramSession` and calls store `signIn`; `signOut` delegates to store; `isAuthMockEnabled()` reads `import.meta.env.VITE_AUTH_MOCK` (treat unset/`true` as enabled). Shape named like future Auth.js helpers — thin client mock only.
    4. Co-located tests: rehydrate pattern from favorites/profile tests; assert persist key; sign-in fields; sign-out clears.
    5. Barrel `src/features/auth/index.ts` exports store, mock helpers, and `TelegramSession` type.
    6. Per D-10: create `.env.example` with commented stubs `VITE_TELEGRAM_BOT_USERNAME=` and `VITE_AUTH_MOCK=true`, plus short comment that Login Widget domain is `ai-food-mobile.vercel.app` (D-06). Do not put secrets; do not commit real `.env` changes.
  </action>
  <verify>
    <automated>pnpm exec vitest run src/features/auth/model/useAuthStore.test.ts</automated>
  </verify>
  <done>
    Auth feature with persist session, mock sign-in/out, tests green, `.env.example` stubs present; no next-auth dependency.
  </done>
</task>

<task type="auto">
  <name>Task 2: Login page + /login route</name>
  <files>src/pages/login/ui/LoginPage.tsx, src/pages/login/index.ts, src/app/router.tsx</files>
  <action>
    1. Per D-01: create `LoginPage` in `src/pages/login/ui/LoginPage.tsx` using `SubpageShell` (title «Вход», back → `/` or `/settings`). Russian copy: кратко объяснить вход через Telegram; кнопка mock «Войти через Telegram» (или «Войти (демо)»).
    2. On click: if mock enabled, call `signInWithMockTelegram` from `@/features/auth`, then per D-03 `navigate('/', { replace: true })`. If mock disabled, toast or muted text that реальный виджет ещё не подключён.
    3. Leave a clear UI placeholder region (bordered box / muted text) for future Telegram Login Widget; mention domain `ai-food-mobile.vercel.app` only as comment or muted helper text (D-06) — no real widget script.
    4. If already authenticated, show short status + button «На главную» and optional «Выйти».
    5. Barrel `src/pages/login/index.ts` exports `LoginPage`.
    6. Per D-02: in `src/app/router.tsx` register path `/login` rendering `LoginPage` as a child of `AppShell` **without** wrapping `ProfileGuard` (same pattern as `/onboarding`). Import from `@/pages/login`.
  </action>
  <verify>
    <automated>pnpm exec tsc --noEmit</automated>
  </verify>
  <done>
    `/login` renders mock sign-in; success navigates to `/`; route is optional (no auth guard).
  </done>
</task>

<task type="auto">
  <name>Task 3: Settings account block — session UI + logout</name>
  <files>src/pages/settings/ui/SettingsPage.tsx</files>
  <action>
    1. Per D-09/D-05: add a top-level section «Аккаунт» (before or after «Профиль», not inside «О приложении») on `SettingsPage`.
    2. When `session` present: show `photo_url` as small avatar (`img` with rounded style, alt=name), display `name` and optionally `@username`; Button «Выйти» calls `signOut` from `@/features/auth` and toast.success «Вы вышли».
    3. When no session: Button/link «Войти» navigates to `/login` (outline, full width, consistent with other Settings rows).
    4. Import only via `@/features/auth` barrel; use atomic Zustand selectors.
    5. Do not change the existing «Telegram» / `@double_cumboy` support-channel row in «О приложении» (D-09) — that is not auth.
  </action>
  <verify>
    <automated>pnpm exec tsc --noEmit</automated>
  </verify>
  <done>
    Settings shows avatar/name + «Выйти» when logged in, else «Войти» → `/login`; support Telegram link untouched.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser storage ↔ app | Mock session JSON in Capacitor Preferences / localStorage |
| Login UI → session write | Untrusted client can forge local session (acceptable for mock-only) |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-wue-01 | Spoofing | mockTelegramAuth sign-in | medium | accept | Explicit mock; no server trust; replace with Auth.js+Telegram verify when backend exists |
| T-wue-02 | Information Disclosure | photo_url / username in localStorage | low | accept | Same device-local model as profile/diary; no network sync |
| T-wue-03 | Elevation of Privilege | forged local session | low | accept | Session grants no privileged API access in this MVP |
| T-wue-SC | Tampering | npm installs | low | accept | No new packages (D-07 forbids next-auth) |
</threat_model>

<verification>
- `pnpm exec vitest run src/features/auth/model/useAuthStore.test.ts` passes
- `pnpm exec tsc --noEmit` passes
- Smoke: guest app works; `/login` → mock enter → `/`; Settings shows user; «Выйти» clears; reload keeps session until logout
</verification>

<success_criteria>
- Optional Telegram-shaped mock auth without backend or next-auth
- `/login` + Settings account UX in Russian
- Session persists (`ai-food-auth`) with D-04 fields
- Support Telegram link in Settings unchanged
</success_criteria>

## Source Audit

| SOURCE | ID | Item | Plan | Status | Notes |
|--------|-----|------|------|--------|-------|
| GOAL | — | Telegram auth mocks via Auth.js-shaped client layer | 01 | COVERED | All 3 tasks |
| REQ | QUICK-260803-wue | Mock Telegram login without backend | 01 | COVERED | |
| RESEARCH | — | (none — quick, no research) | — | n/a | |
| CONTEXT | D-01 | Separate /login + mock button | T2 | COVERED | |
| CONTEXT | D-02 | Login optional | T2 | COVERED | No ProfileGuard on /login |
| CONTEXT | D-03 | Redirect to / | T2 | COVERED | |
| CONTEXT | D-04 | Session fields | T1 | COVERED | |
| CONTEXT | D-05 | Logout in Settings | T3 | COVERED | |
| CONTEXT | D-06 | Domain / no bot token | T1–T2 | COVERED | env + placeholder |
| CONTEXT | D-07 | No next-auth package | T1 | COVERED | |
| CONTEXT | D-08 | FSD auth + Zustand persist | T1 | COVERED | |
| CONTEXT | D-09 | Settings avatar/name or Войти | T3 | COVERED | |
| CONTEXT | D-10 | Env stubs | T1 | COVERED | |

<output>
Create `.planning/quick/260803-wue-telegram-auth-js/260803-wue-SUMMARY.md` when done
</output>
