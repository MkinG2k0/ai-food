# Plan: QA bugs — auth iOS, refine 10MB, friends remove, portions UX

**Branch:** `fix/qa-bugs-auth-meals-friends-portions`  
**Scope:** A — bugs only (no marketing/AI UI)  
**Base:** `b39c4a1`

## Global Constraints

- Apps: `apps/ai-food` (client), `apps/ai-app` (gateway friends API)
- FSD + barrels; no `any`; TDD (failing test first)
- File size ≤150 lines; hooks for business logic
- **Do NOT git commit** unless the user later asks — leave working tree dirty
- Russian UI copy where user-facing
- Meal photo blobs never sync; refine must compress like analyze

## Tasks

### Task 1 — iOS auth UTF-16 + username fallback to Telegram ID
**Files:** `apps/ai-food/src/features/auth/api/signInWithTelegram.ts` (+ test)

**Requirements:**
1. If Telegram `username` is missing/empty, set session `username` to stringified `telegramId` (so friends/search/display never blank).
2. Fix `placeholderAvatar`: never take `name[0]` of a multi-code-unit grapheme; use safe first letter / fallback `"T"`; sanitize lone UTF-16 surrogates before `encodeURIComponent` so Safari never throws `String contained an illegal UTF-16 sequence.`
3. `mapTelegramUserToSession` must not throw on emoji-leading names without photoUrl.
4. Tests: emoji name + no photo → session ok, data URL avatar; no username → username === telegramId string; existing happy path still passes.

### Task 2 — Refine meal: compress image + clear errors
**Files:** `useRefineMeal.ts`, tests; optionally shared helper for base64→File→compress

**Requirements:**
1. Before sending `imageDataUrl` to refine API, compress via `compressImageForAi` (same as analyze).
2. If compressed payload still too large (>~8MB data URL) or compress fails badly → omit image, text-only refine.
3. Map 413 / timeout to user-friendly Russian errors (not raw English gateway text) where refine surfaces them.
4. Tests cover compress path called; oversized → no image in API call.

### Task 3 — Portions: manual input scales KBJU
**Files:** `MealSummaryEditor.tsx` (+ tests if present)

**Requirements:**
1. Manual portions field commits via `setMealPortions` (scales KBJU), not `redefineMealPortions`.
2. Update aria-label / title to say it changes calories/macros.
3. Keep `redefineMealPortions` in store for rare use; do not wire it to the main input. Optional: no UI for redefine in this task (YAGNI) unless already exposed elsewhere.
4. Test or update e2e expectations: typing 0.5 recalculates like +/- .

### Task 4 — Remove friend API + UI
**Files:** `apps/ai-app` friends lib/routes + tests; `apps/ai-food` friendsApi, queries, FriendProfilePage UI

**Requirements:**
1. `DELETE /user/friends/:userId` — only if accepted friendship exists; mark removed (or delete row per existing schema pattern).
2. Client API + mutation + confirm button «Удалить из друзей» on friend profile.
3. Invalidate friends list; toast on success/error.
4. Tests on gateway + client API.

## Out of scope
Marketing, paywall, AI UI polish (option A).
