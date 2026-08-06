# Telegram Onboarding Login + Nutrition Profile Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Telegram login on onboarding step «Ваш пол»; sync `UserProfile` + `DailyTargets` to the gateway; restore and skip onboarding when the server already has a nutrition profile.

**Architecture:** Store `{ profile, targets }` as `User.nutritionProfile` JSON in Postgres. Expose via `publicUser` + `PUT /auth/profile`. Client helpers apply remote profile into `useProfileStore` and push local changes after onboarding finish/skip and Settings КБЖУ save. Reuse existing bot deep-link login (`TelegramBotLoginButton`).

**Tech Stack:** Prisma/Postgres + Express (`apps/ai-app`), React/FSD + Zustand (`apps/ai-food`), Vitest + Supertest, Zod validation.

**Spec:** `docs/superpowers/specs/2026-08-06-telegram-onboarding-profile-sync-design.md`

## Global Constraints

- Sync payload is **only** `UserProfile` + `DailyTargets` (no micronutrients on server).
- «Previously registered» means **non-null valid `nutritionProfile`**, not merely an existing `User` row.
- Telegram auth stays bot deep-link (no Login Widget / Mini App).
- Login remains optional for guests; PUT only when `userToken` is set.
- PUT failures must not wipe local profile; show a toast.
- Corrupt server JSON → treat as `null` (force onboarding).
- Russian UI copy: «Войти через Telegram», «С возвращением», «Вы вошли — заполните профиль».

## File structure

| Path | Responsibility |
|------|----------------|
| `apps/ai-app/prisma/schema.prisma` | Add `nutritionProfile Json?` |
| `apps/ai-app/prisma/migrations/YYYYMMDDHHMMSS_user_nutrition_profile/` | Migration |
| `apps/ai-app/src/lib/nutritionProfile.ts` | Zod schema + parse/normalize for JSON |
| `apps/ai-app/src/lib/nutritionProfile.test.ts` | Unit tests for parse |
| `apps/ai-app/src/routes/auth.ts` | `publicUser` field + `PUT /auth/profile` |
| `apps/ai-app/src/routes/auth.nutritionProfile.test.ts` | Route tests |
| `apps/ai-food/src/features/auth/model/nutritionProfile.ts` | Client payload type + parse |
| `apps/ai-food/src/features/auth/api/putNutritionProfile.ts` | `PUT /auth/profile` |
| `apps/ai-food/src/features/auth/api/fetchAuthMe.ts` | `GET /auth/me` |
| `apps/ai-food/src/features/auth/model/applyRemoteNutritionProfile.ts` | Write into profile store |
| `apps/ai-food/src/features/auth/model/syncNutritionProfile.ts` | Fire-and-forget PUT wrapper |
| `apps/ai-food/src/features/auth/api/signInWithTelegramBot.ts` | Return `AuthLoginResult` with `nutritionProfile` |
| `apps/ai-food/src/features/auth/api/signInWithDemo.ts` | Same return shape |
| `apps/ai-food/src/features/auth/ui/TelegramBotLoginButton.tsx` | Pass result to `onSuccess` |
| `apps/ai-food/src/features/onboarding/ui/steps/StepGender.tsx` | Telegram CTA |
| `apps/ai-food/src/features/onboarding/ui/OnboardingPage.tsx` | Cold-start restore via `/auth/me` |
| `apps/ai-food/src/features/onboarding/model/useOnboarding.ts` | Sync after finish/skip |
| `apps/ai-food/src/pages/settings/ui/SettingsPage.tsx` | Sync after КБЖУ save |
| `apps/ai-food/src/pages/login/ui/LoginPage.tsx` | Restore / route by nutritionProfile |
| `apps/ai-food/docs/AI-GATEWAY.md` | Document endpoint + field |
| `apps/ai-food/src/features/auth/index.ts` | Re-export new public symbols |

---

### Task 1: Gateway nutritionProfile parse helper

**Files:**
- Create: `apps/ai-app/src/lib/nutritionProfile.ts`
- Create: `apps/ai-app/src/lib/nutritionProfile.test.ts`

**Interfaces:**
- Consumes: Zod
- Produces: `NutritionProfilePayload` type; `nutritionProfileBodySchema` (Zod); `parseNutritionProfile(value: unknown): NutritionProfilePayload | null`; `serializeNutritionProfile(payload: NutritionProfilePayload): object`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  parseNutritionProfile,
  nutritionProfileBodySchema,
} from './nutritionProfile.js';

const valid = {
  profile: {
    gender: 'male',
    age: 30,
    height: 180,
    weight: 80,
    targetWeight: 75,
    targetWeightDate: '2026-12-01',
    activity: 'medium',
    goal: 'lose',
    dietType: 'none',
  },
  targets: { kcal: 2000, protein: 150, fat: 60, carbs: 200, fiber: 25 },
};

describe('parseNutritionProfile', () => {
  it('returns payload for valid object', () => {
    expect(parseNutritionProfile(valid)).toEqual(valid);
  });

  it('returns null for null/undefined/garbage', () => {
    expect(parseNutritionProfile(null)).toBeNull();
    expect(parseNutritionProfile(undefined)).toBeNull();
    expect(parseNutritionProfile({ profile: {} })).toBeNull();
    expect(parseNutritionProfile('x')).toBeNull();
  });
});

describe('nutritionProfileBodySchema', () => {
  it('rejects bad gender', () => {
    const bad = {
      ...valid,
      profile: { ...valid.profile, gender: 'other' },
    };
    expect(nutritionProfileBodySchema.safeParse(bad).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --dir apps/ai-app test src/lib/nutritionProfile.test.ts`

Expected: FAIL (module not found)

- [ ] **Step 3: Implement helper**

```ts
import { z } from 'zod';

const profileSchema = z.object({
  gender: z.enum(['male', 'female']),
  age: z.number().positive(),
  height: z.number().positive(),
  weight: z.number().positive(),
  targetWeight: z.number().positive(),
  targetWeightDate: z.string().min(1),
  activity: z.enum(['low', 'medium', 'high']),
  goal: z.enum(['lose', 'maintain', 'gain']),
  dietType: z.enum(['none', 'halal', 'vegan', 'vegetarian']),
});

const targetsSchema = z.object({
  kcal: z.number().positive(),
  protein: z.number().nonnegative(),
  fat: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fiber: z.number().nonnegative(),
});

export const nutritionProfileBodySchema = z.object({
  profile: profileSchema,
  targets: targetsSchema,
});

export type NutritionProfilePayload = z.infer<typeof nutritionProfileBodySchema>;

export function parseNutritionProfile(
  value: unknown,
): NutritionProfilePayload | null {
  const parsed = nutritionProfileBodySchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function serializeNutritionProfile(
  payload: NutritionProfilePayload,
): NutritionProfilePayload {
  return nutritionProfileBodySchema.parse(payload);
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `pnpm --dir apps/ai-app test src/lib/nutritionProfile.test.ts`

- [ ] **Step 5: Commit**

```bash
git add apps/ai-app/src/lib/nutritionProfile.ts apps/ai-app/src/lib/nutritionProfile.test.ts
git commit -m "feat(ai-app): add nutritionProfile zod parse helper"
```

---

### Task 2: Prisma field + PUT /auth/profile + publicUser

**Files:**
- Modify: `apps/ai-app/prisma/schema.prisma` (`User` model)
- Create: migration via Prisma CLI
- Modify: `apps/ai-app/src/routes/auth.ts`
- Create: `apps/ai-app/src/routes/auth.nutritionProfile.test.ts`

**Interfaces:**
- Consumes: `parseNutritionProfile`, `nutritionProfileBodySchema`, `serializeNutritionProfile`
- Produces: `publicUser(...).nutritionProfile: NutritionProfilePayload | null`; `PUT /auth/profile`

- [ ] **Step 1: Add field to schema**

In `User` model add:

```prisma
  nutritionProfile       Json?
```

- [ ] **Step 2: Create migration**

Run from `apps/ai-app`:

```bash
pnpm prisma:migrate -- --name user_nutrition_profile
```

(If interactive name prompt fails in non-TTY, create folder `prisma/migrations/20260806180000_user_nutrition_profile/migration.sql` with:)

```sql
ALTER TABLE "User" ADD COLUMN "nutritionProfile" JSONB;
```

Then `pnpm exec prisma generate`.

- [ ] **Step 3: Write failing route tests**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { errorHandler } from '../middleware/error.js';

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  verifyUserToken: vi.fn(),
  assertAuthConfigured: vi.fn(),
  isDatabaseConfigured: vi.fn(),
  getPrisma: vi.fn(),
}));

vi.mock('../lib/prisma.js', () => ({
  isDatabaseConfigured: mocks.isDatabaseConfigured,
  getPrisma: mocks.getPrisma,
}));
vi.mock('../lib/jwt.js', () => ({
  verifyUserToken: mocks.verifyUserToken,
  assertAuthConfigured: mocks.assertAuthConfigured,
  signUserToken: vi.fn(),
}));
vi.mock('../lib/quota.js', () => ({ ensureDevice: vi.fn() }));
vi.mock('../lib/telegramLoginChallenge.js', () => ({
  createLoginChallenge: vi.fn(),
  getLoginChallengeById: vi.fn(),
  consumeLoginChallenge: vi.fn(),
}));
vi.mock('../lib/telegramBotApi.js', () => ({
  buildBotDeepLink: vi.fn(),
  getTelegramBotToken: vi.fn(),
  getTelegramBotUsername: vi.fn(),
}));

const { authRouter } = await import('./auth.js');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/auth', authRouter);
  app.use(errorHandler);
  return app;
}

const nutritionProfile = {
  profile: {
    gender: 'female',
    age: 28,
    height: 165,
    weight: 60,
    targetWeight: 58,
    targetWeightDate: '2026-10-01',
    activity: 'low',
    goal: 'maintain',
    dietType: 'vegetarian',
  },
  targets: { kcal: 1800, protein: 100, fat: 50, carbs: 180, fiber: 25 },
};

const baseUser = {
  id: 'user-1',
  telegramId: '42',
  username: 'u',
  firstName: 'A',
  lastName: null,
  photoUrl: null,
  subscriptionStatus: 'none' as const,
  subscriptionExpiresAt: null,
  dataConsentAt: null,
  dataConsentVersion: null,
  nutritionProfile: null as unknown,
};

describe('PUT /auth/profile', () => {
  beforeEach(() => {
    mocks.isDatabaseConfigured.mockReturnValue(true);
    mocks.getPrisma.mockReturnValue({
      user: { findUnique: mocks.findUnique, update: mocks.update },
    });
    mocks.verifyUserToken.mockResolvedValue({
      sub: baseUser.id,
      telegramId: baseUser.telegramId,
    });
  });

  afterEach(() => vi.clearAllMocks());

  it('401 without token', async () => {
    const res = await request(createApp())
      .put('/auth/profile')
      .send(nutritionProfile);
    expect(res.status).toBe(401);
  });

  it('400 on invalid body', async () => {
    mocks.findUnique.mockResolvedValue(baseUser);
    const res = await request(createApp())
      .put('/auth/profile')
      .set('x-user-token', 'jwt')
      .send({ profile: { gender: 'x' } });
    expect(res.status).toBe(400);
  });

  it('stores profile and returns it on me', async () => {
    mocks.findUnique.mockResolvedValue(baseUser);
    mocks.update.mockResolvedValue({
      ...baseUser,
      nutritionProfile,
    });

    const put = await request(createApp())
      .put('/auth/profile')
      .set('x-user-token', 'jwt')
      .send(nutritionProfile);
    expect(put.status).toBe(200);
    expect(put.body.nutritionProfile).toEqual(nutritionProfile);
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: baseUser.id },
      data: { nutritionProfile },
    });

    mocks.findUnique.mockResolvedValue({
      ...baseUser,
      nutritionProfile,
    });
    const me = await request(createApp())
      .get('/auth/me')
      .set('x-user-token', 'jwt');
    expect(me.status).toBe(200);
    expect(me.body.nutritionProfile).toEqual(nutritionProfile);
  });

  it('me returns null for corrupt stored JSON', async () => {
    mocks.findUnique.mockResolvedValue({
      ...baseUser,
      nutritionProfile: { broken: true },
    });
    const me = await request(createApp())
      .get('/auth/me')
      .set('x-user-token', 'jwt');
    expect(me.status).toBe(200);
    expect(me.body.nutritionProfile).toBeNull();
  });
});
```

- [ ] **Step 4: Run tests — expect FAIL**

Run: `pnpm --dir apps/ai-app test src/routes/auth.nutritionProfile.test.ts`

Expected: FAIL (route missing / field missing)

- [ ] **Step 5: Update `publicUser` and add PUT**

In `auth.ts`:

1. Import helpers from `../lib/nutritionProfile.js`.
2. Extend `publicUser` input to include `nutritionProfile?: unknown` and return:

```ts
nutritionProfile: parseNutritionProfile(user.nutritionProfile ?? null),
```

3. Add route (mirror `/consent` JWT pattern):

```ts
authRouter.put(
  '/profile',
  asyncHandler(async (req, res) => {
    assertAuthConfigured();
    if (!isDatabaseConfigured()) {
      throw new ApiError(503, 'DB_UNAVAILABLE', 'Database is not configured.');
    }
    const header = req.header('x-user-token')?.trim();
    if (!header) {
      throw new ApiError(401, 'INVALID_USER_TOKEN', 'X-User-Token required.');
    }
    const payload = await verifyUserToken(header);
    const parsed = nutritionProfileBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid nutrition profile.');
    }
    const prisma = getPrisma();
    const existing = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!existing) {
      throw new ApiError(401, 'INVALID_USER_TOKEN', 'User not found.');
    }
    const nutritionProfile = serializeNutritionProfile(parsed.data);
    const user = await prisma.user.update({
      where: { id: existing.id },
      data: { nutritionProfile },
    });
    res.json(publicUser(user));
  }),
);
```

Ensure every `publicUser(...)` call site still typechecks (Prisma `User` now has the field).

- [ ] **Step 6: Run tests — expect PASS**

Run: `pnpm --dir apps/ai-app test src/routes/auth.nutritionProfile.test.ts`

Also run: `pnpm --dir apps/ai-app test src/routes/auth.consent.test.ts src/routes/auth.demo.test.ts`  
(update `baseUser` fixtures in older tests **only if** TypeScript/runtime requires `nutritionProfile` — prefer optional field so old fixtures keep working)

- [ ] **Step 7: Commit**

```bash
git add apps/ai-app/prisma apps/ai-app/src/routes/auth.ts apps/ai-app/src/routes/auth.nutritionProfile.test.ts
git commit -m "feat(ai-app): persist User.nutritionProfile via PUT /auth/profile"
```

---

### Task 3: Client nutrition profile types + API

**Files:**
- Create: `apps/ai-food/src/features/auth/model/nutritionProfile.ts`
- Create: `apps/ai-food/src/features/auth/model/nutritionProfile.test.ts`
- Create: `apps/ai-food/src/features/auth/api/putNutritionProfile.ts`
- Create: `apps/ai-food/src/features/auth/api/fetchAuthMe.ts`
- Modify: `apps/ai-food/src/features/auth/index.ts`

**Interfaces:**
- Produces:
  - `export type NutritionProfilePayload = { profile: UserProfile; targets: DailyTargets }`
  - `parseNutritionProfile(value: unknown): NutritionProfilePayload | null`
  - `putNutritionProfile(payload: NutritionProfilePayload): Promise<NutritionProfilePayload>`
  - `fetchAuthMe(): Promise<{ nutritionProfile: NutritionProfilePayload | null; /* passthrough fields ok */ }>`

- [ ] **Step 1: Write parse unit test**

```ts
import { describe, expect, it } from 'vitest';
import { parseNutritionProfile } from './nutritionProfile';

const valid = {
  profile: {
    gender: 'male' as const,
    age: 25,
    height: 170,
    weight: 70,
    targetWeight: 70,
    targetWeightDate: '2026-08-01',
    activity: 'medium' as const,
    goal: 'maintain' as const,
    dietType: 'none' as const,
  },
  targets: { kcal: 2200, protein: 120, fat: 70, carbs: 250, fiber: 30 },
};

describe('parseNutritionProfile (client)', () => {
  it('accepts valid payload', () => {
    expect(parseNutritionProfile(valid)).toEqual(valid);
  });
  it('rejects corrupt', () => {
    expect(parseNutritionProfile({ targets: valid.targets })).toBeNull();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --dir apps/ai-food exec vitest run src/features/auth/model/nutritionProfile.test.ts`

- [ ] **Step 3: Implement model + APIs**

`nutritionProfile.ts` — manual guards mirroring server enums (no Zod on client unless already used; prefer plain TypeScript checks matching server).

`putNutritionProfile.ts` (same fetch style as `submitDataConsent.ts`):

```ts
export async function putNutritionProfile(
  payload: NutritionProfilePayload,
): Promise<NutritionProfilePayload> {
  const gatewayUrl = import.meta.env.VITE_AI_GATEWAY_URL as string | undefined;
  if (!gatewayUrl?.trim()) {
    throw new Error('VITE_AI_GATEWAY_URL не задан');
  }
  const userToken = useAuthStore.getState().userToken;
  if (!userToken) {
    throw new Error('Нужен вход для сохранения профиля');
  }
  const response = await fetch(
    `${gatewayUrl.replace(/\/$/, '')}/auth/profile`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Token': userToken,
      },
      body: JSON.stringify(payload),
    },
  );
  const body = (await response.json().catch(() => ({}))) as {
    nutritionProfile?: unknown;
    message?: string;
  };
  const parsed = parseNutritionProfile(body.nutritionProfile);
  if (!response.ok || !parsed) {
    throw new Error(
      body.message ?? `Не удалось сохранить профиль (${response.status})`,
    );
  }
  return parsed;
}
```

`fetchAuthMe.ts`:

```ts
export async function fetchAuthMe(): Promise<{
  nutritionProfile: NutritionProfilePayload | null;
}> {
  // GET /auth/me with X-User-Token; parse nutritionProfile via parseNutritionProfile
  // throw on !ok
}
```

Export from `index.ts`.

- [ ] **Step 4: Run parse test — PASS**

- [ ] **Step 5: Commit**

```bash
git add apps/ai-food/src/features/auth
git commit -m "feat(ai-food): add nutrition profile client API"
```

---

### Task 4: Apply remote profile + sync after local writes

**Files:**
- Create: `apps/ai-food/src/features/auth/model/applyRemoteNutritionProfile.ts`
- Create: `apps/ai-food/src/features/auth/model/applyRemoteNutritionProfile.test.ts`
- Create: `apps/ai-food/src/features/auth/model/syncNutritionProfile.ts`
- Modify: `apps/ai-food/src/features/onboarding/model/useOnboarding.ts`
- Modify: `apps/ai-food/src/pages/settings/ui/SettingsPage.tsx`
- Modify: `apps/ai-food/src/features/auth/index.ts`

**Interfaces:**
- Produces:
  - `applyRemoteNutritionProfile(payload: NutritionProfilePayload): void` — `setProfile` + `setMicronutrientTargets(defaultMicronutrientTargets(gender))`
  - `syncNutritionProfileToServer(): void` — if token + local profile+targets, `void putNutritionProfile(...).catch(toast)`
- Consumes: `useProfileStore`, `defaultMicronutrientTargets` from onboarding (auth→onboarding is an FSD reverse dependency). **Avoid:** put `defaultMicronutrientTargets` import behind a parameter, OR move the apply helper into `features/onboarding` and keep only `sync`/`put` in auth.

**Preferred placement to respect FSD direction:**

| Symbol | Slice |
|--------|-------|
| `putNutritionProfile` / `fetchAuthMe` / `parseNutritionProfile` | `features/auth` |
| `applyRemoteNutritionProfile` | `features/onboarding/model/applyRemoteNutritionProfile.ts` (imports auth types + profile store + defaults) |
| `syncNutritionProfileToServer` | `features/onboarding/model/syncNutritionProfileToServer.ts` (reads profile store, calls `putNutritionProfile`) |

- [ ] **Step 1: Write apply unit test**

Mock `useProfileStore.getState` setters; assert `setProfile` and `setMicronutrientTargets` called with gender-aware defaults.

- [ ] **Step 2: Implement apply + sync**

```ts
// syncNutritionProfileToServer.ts
import { toast } from 'sonner';
import { putNutritionProfile } from '@/features/auth';
import { useAuthStore } from '@/features/auth';
import { useProfileStore } from './useProfileStore';

export function syncNutritionProfileToServer(): void {
  const token = useAuthStore.getState().userToken;
  if (!token) return;
  const { profile, targets } = useProfileStore.getState();
  if (!profile || !targets) return;
  void putNutritionProfile({ profile, targets }).catch((err) => {
    toast.error(
      err instanceof Error ? err.message : 'Не удалось сохранить профиль на сервер',
    );
  });
}
```

- [ ] **Step 3: Hook `useOnboarding.completeWithProfile`**

After `setProfile(profile, targets)` (and ideally after micros), call `syncNutritionProfileToServer()`.

- [ ] **Step 4: Hook Settings `handleSaveTargets`**

After `updateTargets(next)`, call `syncNutritionProfileToServer()`.

- [ ] **Step 5: Also sync after Settings import backup** when authenticated (after `setState` with profile+targets).

- [ ] **Step 6: Run related tests**

Run: `pnpm --dir apps/ai-food exec vitest run src/features/onboarding/model`

- [ ] **Step 7: Commit**

```bash
git add apps/ai-food/src/features/onboarding apps/ai-food/src/pages/settings/ui/SettingsPage.tsx apps/ai-food/src/features/auth/index.ts
git commit -m "feat(ai-food): sync nutrition profile after onboarding and settings"
```

---

### Task 5: StepGender Telegram CTA + onboarding cold start

**Files:**
- Modify: `apps/ai-food/src/features/onboarding/ui/steps/StepGender.tsx`
- Modify: `apps/ai-food/src/features/onboarding/ui/OnboardingPage.tsx`
- Modify: `apps/ai-food/src/features/auth/api/signInWithTelegramBot.ts` (return `AuthLoginResult`)
- Modify: `apps/ai-food/src/features/auth/api/signInWithDemo.ts`
- Modify: `apps/ai-food/src/features/auth/ui/TelegramBotLoginButton.tsx`
- Create: `apps/ai-food/src/features/auth/model/authLoginResult.ts` (optional small type file)

**Interfaces:**
- Produces:
```ts
export type AuthLoginResult = {
  session: TelegramSession;
  nutritionProfile: NutritionProfilePayload | null;
};
```
- `signInWithTelegramBot(): Promise<AuthLoginResult>`
- `TelegramBotLoginButton` props: `onSuccess: (result: AuthLoginResult) => void`

- [ ] **Step 1: Change login functions to parse and return `nutritionProfile`**

In `signInWithTelegramBot` when `status === 'ok'`:

```ts
const nutritionProfile = parseNutritionProfile(
  (status.user as { nutritionProfile?: unknown }).nutritionProfile,
);
// ... existing signIn ...
return { session, nutritionProfile };
```

Same for `signInWithDemo`.

Update `TelegramBotLoginButton`:

```ts
const result = await signInWithTelegramBot({ signal: controller.signal });
onSuccess(result);
```

- [ ] **Step 2: Update StepGender UI**

```tsx
// After «Далее» button:
{session ? (
  <p className="text-center text-sm text-muted-foreground">
    Вы вошли как {session.name}
    {session.username ? ` (@${session.username})` : ''}
  </p>
) : (
  <>
    <div className="relative flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs text-muted-foreground">или</span>
      <div className="h-px flex-1 bg-border" />
    </div>
    <TelegramBotLoginButton
      onSuccess={(result) => {
        if (result.nutritionProfile) {
          applyRemoteNutritionProfile(result.nutritionProfile);
          toast.success('С возвращением');
          navigate('/', { replace: true });
          return;
        }
        toast.success('Вы вошли — заполните профиль');
      }}
      onError={(message) => toast.error(message)}
    />
  </>
)}
```

Import `useNavigate`, `toast`, `TelegramBotLoginButton`, `useAuthStore`, `applyRemoteNutritionProfile`.

- [ ] **Step 3: Cold start on OnboardingPage**

After hydration, if `!isComplete` and `useAuthStore.getState().userToken`:

```ts
useEffect(() => {
  let cancelled = false;
  async function restore() {
    const token = useAuthStore.getState().userToken;
    if (!token || useProfileStore.getState().profile) return;
    try {
      const me = await fetchAuthMe();
      if (cancelled || !me.nutritionProfile) return;
      applyRemoteNutritionProfile(me.nutritionProfile);
      // profile store update → isComplete true → existing Navigate to /
    } catch {
      // ignore; user can still log in / fill onboarding
    }
  }
  void restore();
  return () => {
    cancelled = true;
  };
}, []);
```

Place effect in `OnboardingPage` (feature) after hydrated check via a small child or run only when `hydrated && !isComplete`.

- [ ] **Step 4: Manual smoke / unit if easy** — StepGender renders login button when logged out (optional RTL test).

- [ ] **Step 5: Commit**

```bash
git add apps/ai-food/src/features/auth apps/ai-food/src/features/onboarding
git commit -m "feat(ai-food): Telegram login on onboarding with profile restore"
```

---

### Task 6: LoginPage navigation + docs

**Files:**
- Modify: `apps/ai-food/src/pages/login/ui/LoginPage.tsx`
- Modify: `apps/ai-food/docs/AI-GATEWAY.md`
- Fix any call sites broken by `AuthLoginResult` return type (grep `signInWithTelegramBot`, `signInWithDemo`, `TelegramBotLoginButton`)

**Interfaces:**
- Login success uses same restore rules as spec

- [ ] **Step 1: Update LoginPage**

```ts
const handleTelegramSuccess = (result: AuthLoginResult) => {
  if (result.nutritionProfile) {
    applyRemoteNutritionProfile(result.nutritionProfile);
    toast.success('С возвращением');
    navigate('/', { replace: true });
    return;
  }
  toast.success('Вход выполнен');
  const hasLocal = useProfileStore.getState().profile !== null;
  navigate(hasLocal ? '/' : '/onboarding', { replace: true });
};
```

Same branching for demo login (`const result = await signInWithDemo()`).

- [ ] **Step 2: Update AI-GATEWAY.md**

In endpoints table add:

| `PUT` | `/auth/profile` | `X-User-Token` | Body `{ profile, targets }` → public user with `nutritionProfile` |

Update `GET /auth/me` / telegram status notes: `user.nutritionProfile` may be object or `null`.

In «Кто вызывает» add put/fetch helpers under `src/features/auth/*`.

- [ ] **Step 3: Grep + fix compile**

Run: `pnpm --dir apps/ai-food type-check`  
Run: `pnpm --dir apps/ai-app test`  
Run: `pnpm --dir apps/ai-food exec vitest run src/features/auth src/features/onboarding`

- [ ] **Step 4: Commit**

```bash
git add apps/ai-food/src/pages/login apps/ai-food/docs/AI-GATEWAY.md apps/ai-food/src/features
git commit -m "feat(ai-food): align LoginPage with nutrition profile restore"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| `User.nutritionProfile` JSON | 2 |
| `PUT /auth/profile` | 2 |
| `GET /auth/me` includes field | 2 |
| Corrupt JSON → null | 1–2 |
| StepGender Telegram CTA | 5 |
| Returning user skip onboarding | 5–6 |
| New user stay on onboarding | 5–6 |
| Sync after finish/skip | 4 |
| Sync after Settings КБЖУ | 4 |
| Cold start `/auth/me` restore | 5 |
| LoginPage restore / onboarding redirect | 6 |
| Micronutrients not synced (defaults on restore) | 4–5 |
| AI-GATEWAY docs | 6 |

## Execution

Per workspace default, implement with **Subagent-Driven Development** (fresh subagent per task + review between tasks). Say when to start.
