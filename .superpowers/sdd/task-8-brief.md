### Task 8: ai-food consent screen + auth store + guard

**Files:**
- Modify: `apps/ai-food/src/features/auth/model/useAuthStore.ts`
- Create: `apps/ai-food/src/features/auth/api/submitDataConsent.ts`
- Create: `apps/ai-food/src/features/auth/api/fetchAuthMe.ts` (optional if login already returns consent вЂ” still useful on app load)
- Create: `apps/ai-food/src/pages/consent/ui/ConsentPage.tsx`
- Create: `apps/ai-food/src/pages/consent/index.ts`
- Create: `apps/ai-food/src/app/ConsentGuard.tsx`
- Create: `apps/ai-food/src/app/ConsentGuard.test.tsx`
- Modify: `apps/ai-food/src/app/router.tsx`
- Modify: `apps/ai-food/src/features/auth/api/signInWithTelegramBot.ts` (+ demo login) to store consent from `user`
- Modify: `apps/ai-food/src/features/auth/index.ts`

**Interfaces:**
- Auth store:

```ts
dataConsentAt: string | null;
setDataConsent: (at: string | null, version: string | null) => void;
// signIn(..., userToken, consent?: { dataConsentAt, dataConsentVersion })
hasDataConsent: () => boolean; // Boolean(dataConsentAt)
```

- Constant in food: `export const DATA_CONSENT_VERSION = '2026-08-06'` in `features/auth/model/dataConsentVersion.ts`

- [ ] **Step 1: Extend store + submitDataConsent**

`submitDataConsent`: POST `${gateway}/auth/consent` with `X-User-Token`, body `{ version: DATA_CONSENT_VERSION }`, update store from response.

On bot/demo login success: `set({ session, userToken, dataConsentAt: user.dataConsentAt ?? null, dataConsentVersion: user.dataConsentVersion ?? null })`.

Persist consent fields in zustand persist (same `ai-food-auth` key).

- [ ] **Step 2: ConsentPage UI**

Full-screen page:
- Title: В«РЎРѕРіР»Р°СЃРёРµ РЅР° РѕР±СЂР°Р±РѕС‚РєСѓ РґР°РЅРЅС‹С…В»
- Bullet list: Telegram-Р°РєРєР°СѓРЅС‚; deviceId; СЃС‚Р°С‚РёСЃС‚РёРєР° РґРµР№СЃС‚РІРёР№ (С„РѕС‚Рѕ/С‚РµРєСЃС‚/СЂСѓС‡РЅРѕР№/С€С‚СЂРёС…РєРѕРґ/СѓС‚РѕС‡РЅРµРЅРёСЏ); РїР»Р°С‚РµР¶Рё Рё РїРѕРґРїРёСЃРєР°; С‚РµС…РЅРёС‡РµСЃРєРёРµ Р»РѕРіРё
- Note: РґРЅРµРІРЅРёРє Рё РљР‘Р–РЈ РѕСЃС‚Р°СЋС‚СЃСЏ РЅР° СѓСЃС‚СЂРѕР№СЃС‚РІРµ
- Link to privacy via existing `legalSiteUrl('/privacy')` helper
- Checkbox В«РЎРѕРіР»Р°СЃРµРЅ РЅР° РѕР±СЂР°Р±РѕС‚РєСѓ СѓРєР°Р·Р°РЅРЅС‹С… РґР°РЅРЅС‹С…В»
- Button В«РџСЂРѕРґРѕР»Р¶РёС‚СЊВ» disabled until checked; on click в†’ submit в†’ navigate `/` (or `from` state)

- [ ] **Step 3: ConsentGuard**

```tsx
export function ConsentGuard({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.userToken);
  const consentAt = useAuthStore((s) => s.dataConsentAt);
  const location = useLocation();
  if (token && !consentAt) {
    return <Navigate to="/consent" replace state={{ from: location.pathname }} />;
  }
  return children;
}
```

- `/consent` route: if no token в†’ `/login`; if already consent в†’ `/`
- Wrap ProfileGuard children (or AppShell authenticated routes) with ConsentGuard **outside or inside** ProfileGuard: order = Consent first then Profile (consent before onboarding is fine). Spec: after login before diary вЂ” wrap the same routes as ProfileGuard + also block settings etc.

```tsx
{ path: '/consent', element: <ConsentPage /> },
{ path: '/', element: <ConsentGuard><ProfileGuard><HomePage /></ProfileGuard></ConsentGuard> },
// same for other protected routes
```

Login page itself stays unwrapped.

- [ ] **Step 4: ConsentGuard tests**

Redirect when token && !consentAt; render children when consent present or logged out.

- [ ] **Step 5: Run tests**

Run: `pnpm --filter ai-food exec vitest run src/app/ConsentGuard.test.tsx`

- [ ] **Step 6: Commit**

```bash
git add apps/ai-food/src/features/auth apps/ai-food/src/pages/consent apps/ai-food/src/app/ConsentGuard.tsx apps/ai-food/src/app/ConsentGuard.test.tsx apps/ai-food/src/app/router.tsx
git commit -m "feat(ai-food): data consent gate after login"
```

---

