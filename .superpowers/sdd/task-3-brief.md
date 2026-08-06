### Task 3: BFF proxy for stats series

**Files:**
- Create: `apps/ai-web/src/app/api/admin/gateway/stats/series/route.ts`

**Interfaces:**
- Consumes: `proxyGatewayAdmin` from `@/lib/gatewayAdmin`
- Produces: `GET /api/admin/gateway/stats/series` → gateway `/admin/stats/series?days=…`

- [ ] **Step 1: Create route**

```ts
import { proxyGatewayAdmin } from '@/lib/gatewayAdmin';

export async function GET(request: Request) {
  const days = new URL(request.url).searchParams.get('days') ?? '30';
  return proxyGatewayAdmin(`stats/series?days=${encodeURIComponent(days)}`);
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm --filter ai-web type-check`

Expected: PASS (or only pre-existing errors unrelated to this file)

- [ ] **Step 3: Commit**

```bash
git add apps/ai-web/src/app/api/admin/gateway/stats/series/route.ts
git commit -m "$(cat <<'EOF'
feat(ai-web): proxy admin stats series endpoint

EOF
)"
```

---

