# Task 2 Report: Prisma — restore Telegram user fields

**Branch:** `feat/telegram-bot-auth`  
**Status:** ✅ Complete  
**Date:** 2026-08-04

---

## Summary

Restored Telegram-based user identity in Prisma schema and added migration SQL. Generated Prisma Client 7.9.1 successfully. Committed per brief.

---

## Step 1: Schema update

**File:** `apps/ai-app/prisma/schema.prisma`

Replaced `User` model:
- **Removed:** `phone String @unique`
- **Added:** `telegramId String @unique`, optional `username`, `firstName`, `lastName`, `photoUrl`
- **Unchanged:** subscription fields, relations (`devices`, `usageEvents`, `payments`)

---

## Step 2: Migration SQL

**File:** `apps/ai-app/prisma/migrations/20260804180000_telegram_bot_user/migration.sql`

Migration strategy (per plan):
1. `DELETE FROM "Payment"` — clears payment rows before user wipe
2. `DELETE FROM "User"` — flash-call phone identities not migrated to Telegram
3. `ALTER TABLE "User"` — drop `phone`, add Telegram columns
4. `CREATE UNIQUE INDEX "User_telegramId_key"`

**Note:** Destructive migration — existing users and payments are wiped. Acceptable for dev/staging per plan rationale.

---

## Step 3: Prisma generate

```text
pnpm exec prisma generate
✔ Generated Prisma Client (7.9.1) to .\src\generated\prisma in 41ms
```

Generated client (gitignored at `apps/ai-app/src/generated/prisma`) confirms `telegramId`, `username`, `firstName`, `lastName`, `photoUrl` on `User` model.

---

## Step 4: Commit

| Field | Value |
|-------|-------|
| Hash | `cdde860` |
| Message | `feat(ai-app): migrate User identity back to telegramId` |
| Files | `schema.prisma`, `migrations/20260804180000_telegram_bot_user/migration.sql` |

---

## Known follow-ups (out of scope)

| Item | Owner | Notes |
|------|-------|-------|
| `auth.ts` still uses `phone` | Task 5 | `where: { phone }`, JWT payload `phone`, response fields |
| `auth.flashcall.test.ts` | Task 5+ | Flash-call tests reference phone model |
| Full `tsc` pass | Task 5 | Expected type errors until auth routes updated |
| `prisma migrate deploy` | Deploy/runtime | Not run in this task — migration file only |

---

## Verification checklist

- [x] Schema matches brief verbatim
- [x] Migration SQL matches brief verbatim
- [x] `prisma generate` succeeded
- [x] Commit created with specified message
- [x] Did not modify `auth.ts` or auth routes
- [ ] `prisma migrate deploy` — not executed (local DB may still be on phone schema until deploy)

---

## Concerns

1. **Data loss on migrate:** Production deploy must account for user/payment wipe or require a custom backfill strategy.
2. **Type errors until Task 5:** `auth.ts` Prisma queries use `phone` — compile will fail until auth refactor.
3. **Generated client not in git:** Regenerated at build/deploy via `prisma generate` (existing project convention).
