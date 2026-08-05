### Task 1: Prisma `PromoCode` model + migration

**Files:**
- Modify: `apps/ai-app/prisma/schema.prisma`
- Create: `apps/ai-app/prisma/migrations/20260805120000_promo_codes/migration.sql`

**Interfaces:**
- Produces: Prisma model `PromoCode` with fields below (client regenerated in Step 3)

- [ ] **Step 1: Add model to schema**

Append to `apps/ai-app/prisma/schema.prisma` after `AppSettings`:

```prisma
model PromoCode {
  id              String   @id @default(cuid())
  code            String   @unique
  discountPercent Int
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

- [ ] **Step 2: Add migration SQL**

Create `apps/ai-app/prisma/migrations/20260805120000_promo_codes/migration.sql`:

```sql
-- CreateTable
CREATE TABLE "PromoCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discountPercent" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PromoCode_code_key" ON "PromoCode"("code");
```

- [ ] **Step 3: Generate Prisma client**

Run from `apps/ai-app`:

```bash
pnpm prisma:generate
```

Expected: exits 0; `PromoCode` appears under `apps/ai-app/src/generated/prisma`.

- [ ] **Step 4: Commit**

```bash
git add apps/ai-app/prisma/schema.prisma apps/ai-app/prisma/migrations/20260805120000_promo_codes/migration.sql
git commit -m "feat(ai-app): add PromoCode prisma model"
```

(If `prisma generate` dirty-checks generated files that are committed in this repo, include them; if generated is gitignored, do not add it.)

---

