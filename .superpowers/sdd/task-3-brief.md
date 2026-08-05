### Task 3: BFF proxy routes for payments

**Files:**
- Create: `apps/ai-web/src/app/api/admin/gateway/payments/route.ts`
- Create: `apps/ai-web/src/app/api/admin/gateway/payments/[id]/route.ts`

**Interfaces:**
- Consumes: `proxyGatewayAdmin(path, init?)` from `@/lib/gatewayAdmin`
- Produces: `GET /api/admin/gateway/payments` в†’ gateway list; `DELETE /api/admin/gateway/payments/:id` в†’ gateway delete
- Client helper already used: `adminApi('payments')` and `adminApi('payments/' + id, { method: 'DELETE' })`

- [ ] **Step 1: Create list proxy**

Create `apps/ai-web/src/app/api/admin/gateway/payments/route.ts`:

```ts
import { proxyGatewayAdmin } from '@/lib/gatewayAdmin';

export async function GET() {
  return proxyGatewayAdmin('payments');
}
```

- [ ] **Step 2: Create delete proxy**

Create `apps/ai-web/src/app/api/admin/gateway/payments/[id]/route.ts`:

```ts
import { proxyGatewayAdmin } from '@/lib/gatewayAdmin';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return proxyGatewayAdmin(`payments/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
```

- [ ] **Step 3: Type-check**

Run:

```bash
pnpm --filter ai-web type-check
```

Expected: PASS (no type errors).

- [ ] **Step 4: Commit**

```bash
git add apps/ai-web/src/app/api/admin/gateway/payments/route.ts apps/ai-web/src/app/api/admin/gateway/payments/[id]/route.ts
git commit -m "$(cat <<'EOF'
feat(ai-web): proxy admin payments list and delete

EOF
)"
```

---

