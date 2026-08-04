### Task 1: Prisma `AppSettings` model + migration

**Files:**
- Modify: `apps/ai-app/prisma/schema.prisma`
- Create: `apps/ai-app/prisma/migrations/20260804220000_app_settings/migration.sql`

**Interfaces:**
- Produces: Prisma model `AppSettings` with fields below

- [ ] **Step 1: Add model to schema**

Append to `apps/ai-app/prisma/schema.prisma`:

```prisma
model AppSettings {
  id                       Int      @id @default(1)
  subscriptionPriceKopecks Int?
  subscriptionDurationDays Int?
  updatedAt                DateTime @updatedAt
}
```

- [ ] **Step 2: Add migration SQL**

Create `apps/ai-app/prisma/migrations/20260804220000_app_settings/migration.sql`:

```sql
-- CreateTable
CREATE TABLE "AppSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "subscriptionPriceKopecks" INTEGER,
    "subscriptionDurationDays" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);
```

- [ ] **Step 3: Generate client**

Run: `cd apps/ai-app && pnpm exec prisma generate`

Expected: success, `AppSettings` available on client types.

- [ ] **Step 4: Commit**

```bash
git add apps/ai-app/prisma/schema.prisma apps/ai-app/prisma/migrations/20260804220000_app_settings
git commit -m "feat(ai-app): add AppSettings singleton for subscription pricing"
```

---
