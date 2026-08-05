### Task 6: ai-web admin Users UI + BFF

**Files:**
- Create: `apps/ai-web/src/app/api/admin/gateway/users/[id]/route.ts`
- Modify: `apps/ai-web/src/components/AdminShell.tsx`
- Create: `apps/ai-web/src/app/admin/users/page.tsx`
- Create: `apps/ai-web/src/app/admin/users/[id]/page.tsx`

**Interfaces:**
- Consumes: `adminApi` в†’ `users?q=`, `users/:id`
- Produces: pages at `/admin/users`, `/admin/users/[id]`

- [ ] **Step 1: BFF detail route**

```ts
import { proxyGatewayAdmin } from '@/lib/gatewayAdmin';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return proxyGatewayAdmin(`users/${encodeURIComponent(id)}`);
}
```

(Match existing Next 15 `params` Promise pattern from `payments/[id]/route.ts`.)

- [ ] **Step 2: AdminShell menu**

Add `{ icon: <UserOutlined />, key: '/admin/users', label: 'РџРѕР»СЊР·РѕРІР°С‚РµР»Рё' }` and `pageTitles['/admin/users'] = 'РџРѕР»СЊР·РѕРІР°С‚РµР»Рё'`.  
Import `UserOutlined` from `@ant-design/icons`.  
Ensure `selectedKey` works for `/admin/users/[id]` via `pathname.startsWith('/admin/users')`.

- [ ] **Step 3: List page**

Mirror `subscriptions/page.tsx` search + Table. Types:

```ts
type UsageCounts = {
  analyze_photo: number;
  analyze_text: number;
  analyze_photo_text: number;
  refine: number;
  manual: number;
  barcode: number;
  analyze: number;
};

type AdminUser = {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
  subscriptionStatus: string;
  subscriptionExpiresAt: string | null;
  hasActiveSubscription: boolean;
  dataConsentAt: string | null;
  dataConsentVersion: string | null;
  createdAt?: string;
  usageCounts: UsageCounts;
};
```

Columns: name, @username, telegramId, subscription Tag, consent (Р”Р°/РќРµС‚ + date), counters (Р¤РѕС‚Рѕ / РўРµРєСЃС‚ / Р¤+Рў / Refine / Р СѓС‡РЅ. / РЁРљ / Legacy), createdAt.  
`onRow: (r) => ({ onClick: () => router.push(`/admin/users/${r.id}`) })`.

PageHeader title В«РџРѕР»СЊР·РѕРІР°С‚РµР»РёВ», subtitle В«РђРєРєР°СѓРЅС‚С‹, СЃРѕРіР»Р°СЃРёРµ Рё СЃС‚Р°С‚РёСЃС‚РёРєР° РіРµРЅРµСЂР°С†РёР№В».

- [ ] **Step 4: Detail page**

`useParams().id` в†’ `adminApi<UserDetailResponse>(\`users/${id}\`)`.  
Sections: profile Card, Statistic grid for counts, Payments Table (reuse formatting from payments page: amount/100, status tags), Events Table (kind, deviceId, createdAt), Button В«Рљ СЃРїРёСЃРєСѓВ» в†’ `/admin/users`.

- [ ] **Step 5: Type-check**

Run: `pnpm --filter ai-web type-check`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/ai-web/src/app/api/admin/gateway/users apps/ai-web/src/components/AdminShell.tsx apps/ai-web/src/app/admin/users
git commit -m "feat(ai-web): admin users list and detail pages"
```

---

