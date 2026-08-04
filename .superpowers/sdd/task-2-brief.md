### Task 2: Prisma — restore Telegram user fields

**Files:**
- Modify: `apps/ai-app/prisma/schema.prisma`
- Create: `apps/ai-app/prisma/migrations/20260804180000_telegram_bot_user/migration.sql`
- Note: `auth.ts` still references `phone` until Task 5 — type-check may fail until then; do not block on full `tsc` until Task 5.

**Interfaces:**
- Consumes: none
- Produces: `User` with `telegramId String @unique`, optional `username`, `firstName`, `lastName`, `photoUrl`; no `phone`

- [ ] **Step 1: Update schema `User` model**

In `apps/ai-app/prisma/schema.prisma`, replace the `User` model with:

```prisma
model User {
  id                     String             @id @default(cuid())
  telegramId             String             @unique
  username               String?
  firstName              String?
  lastName               String?
  photoUrl               String?
  subscriptionStatus     SubscriptionStatus @default(none)
  subscriptionExpiresAt  DateTime?
  createdAt              DateTime           @default(now())
  updatedAt              DateTime           @updatedAt
  devices                Device[]
  usageEvents            UsageEvent[]
  payments               Payment[]
}
```

- [ ] **Step 2: Add migration SQL**

Create `apps/ai-app/prisma/migrations/20260804180000_telegram_bot_user/migration.sql`:

```sql
-- Flash-Call phone identities are not migrated to Telegram.
DELETE FROM "Payment";
DELETE FROM "User";

ALTER TABLE "User" DROP COLUMN "phone",
ADD COLUMN "telegramId" TEXT NOT NULL,
ADD COLUMN "username" TEXT,
ADD COLUMN "firstName" TEXT,
ADD COLUMN "lastName" TEXT,
ADD COLUMN "photoUrl" TEXT;

CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");
```

- [ ] **Step 3: Generate client**

Run: `cd apps/ai-app && pnpm exec prisma generate`
Expected: success

- [ ] **Step 4: Commit**

```bash
git add apps/ai-app/prisma/schema.prisma apps/ai-app/prisma/migrations/20260804180000_telegram_bot_user
git commit -m "feat(ai-app): migrate User identity back to telegramId"
```

---

