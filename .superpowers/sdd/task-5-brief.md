### Task 5: ai-web gateway proxy for promos

**Files:**
- Create: `apps/ai-web/src/app/api/admin/gateway/promos/route.ts`
- Create: `apps/ai-web/src/app/api/admin/gateway/promos/[id]/route.ts`

**Interfaces:**
- Consumes: `proxyGatewayAdmin` from `@/lib/gatewayAdmin`
- Produces: Next routes that forward to gateway `/admin/promos` and `/admin/promos/:id`

- [ ] **Step 1: Create list/create proxy**

Create `apps/ai-web/src/app/api/admin/gateway/promos/route.ts`:

```ts
import { proxyGatewayAdmin } from '@/lib/gatewayAdmin';

export async function GET() {
  return proxyGatewayAdmin('promos');
}

export async function POST(request: Request) {
  return proxyGatewayAdmin('promos', {
    body: await request.text(),
    method: 'POST',
  });
}
```

- [ ] **Step 2: Create delete proxy**

Create `apps/ai-web/src/app/api/admin/gateway/promos/[id]/route.ts`:

```ts
import { proxyGatewayAdmin } from '@/lib/gatewayAdmin';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return proxyGatewayAdmin(`promos/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
```

- [ ] **Step 3: Smoke-check TypeScript on new files**

```bash
cd apps/ai-web && pnpm exec tsc --noEmit
```

Expected: exits 0 (or only pre-existing unrelated errors вЂ” new files must be clean).

- [ ] **Step 4: Commit**

```bash
git add apps/ai-web/src/app/api/admin/gateway/promos/route.ts apps/ai-web/src/app/api/admin/gateway/promos/[id]/route.ts
git commit -m "feat(ai-web): proxy admin promo CRUD"
```

---

