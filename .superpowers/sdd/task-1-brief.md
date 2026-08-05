### Task 1: Prisma User consent fields

**Files:**
- Modify: `apps/ai-app/prisma/schema.prisma`
- Create: `apps/ai-app/prisma/migrations/20260806010000_user_data_consent/migration.sql`
- Create: `apps/ai-app/src/lib/consent.ts`
- Test: N/A (schema); generate client

**Interfaces:**
- Produces: `User.dataConsentAt: DateTime | null`, `User.dataConsentVersion: String | null`; `DATA_CONSENT_VERSION = '2026-08-06'`

- [ ] **Step 1: Add fields to schema**

In `model User` after `photoUrl`:

```prisma
  dataConsentAt      DateTime?
  dataConsentVersion String?
```

- [ ] **Step 2: Add migration SQL**

```sql
-- AlterTable
ALTER TABLE "User" ADD COLUMN "dataConsentAt" TIMESTAMP(3),
ADD COLUMN "dataConsentVersion" TEXT;
```

- [ ] **Step 3: Add consent constant**

`apps/ai-app/src/lib/consent.ts`:

```ts
export const DATA_CONSENT_VERSION = '2026-08-06';
```

- [ ] **Step 4: Generate client**

Run: `pnpm --filter openrouter-gateway prisma:generate`  
Expected: success, no schema errors

- [ ] **Step 5: Commit**

```bash
git add apps/ai-app/prisma/schema.prisma apps/ai-app/prisma/migrations/20260806010000_user_data_consent apps/ai-app/src/lib/consent.ts
git commit -m "feat(ai-app): add User data consent fields"
```

---

