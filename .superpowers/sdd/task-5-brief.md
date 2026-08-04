### Task 5: Legal pages + routes + Settings links

**Files:**
- Create: `apps/ai-food/src/pages/legal/ui/LegalDocumentPage.tsx`
- Create: `apps/ai-food/src/pages/legal/ui/TermsPage.tsx`
- Create: `apps/ai-food/src/pages/legal/ui/PrivacyPage.tsx`
- Create: `apps/ai-food/src/pages/legal/index.ts`
- Modify: `apps/ai-food/src/app/router.tsx`
- Modify: `apps/ai-food/src/pages/settings/ui/SettingsPage.tsx`

**Interfaces:**
- Consumes: `buildTermsSections`, `buildPrivacySections`, `legalConfig`, `useSubscriptionPrice`, `SubpageShell`
- Produces: routes `/legal/terms`, `/legal/privacy` (no ProfileGuard); Settings buttons

- [ ] **Step 1: Implement LegalDocumentPage**

```tsx
import { SubpageShell } from '@/shared/ui';
import type { LegalSection } from '@/shared/legal/types';
import { legalConfig } from '@/shared/legal/legalConfig';

type Props = {
  title: string;
  onBack: () => void;
  sections: LegalSection[];
  loadingHint?: string | null;
};

export function LegalDocumentPage({
  title,
  onBack,
  sections,
  loadingHint,
}: Props) {
  return (
    <SubpageShell title={title} onBack={onBack} mainClassName="space-y-6">
      <p className="text-sm text-muted-foreground">
        Р РµРґР°РєС†РёСЏ РѕС‚{' '}
        {new Date(legalConfig.revisionDate + 'T00:00:00').toLocaleDateString(
          'ru-RU',
        )}
      </p>
      {loadingHint ? (
        <p className="text-sm text-muted-foreground">{loadingHint}</p>
      ) : null}
      {sections.map((section) => (
        <section key={section.title} className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            {section.title}
          </h2>
          {section.paragraphs.map((p) => (
            <p key={p.slice(0, 48)} className="text-sm text-muted-foreground">
              {p}
            </p>
          ))}
        </section>
      ))}
    </SubpageShell>
  );
}
```

- [ ] **Step 2: TermsPage + PrivacyPage**

`TermsPage.tsx`:

```tsx
import { useNavigate } from 'react-router-dom';
import { useSubscriptionPrice } from '@/features/billing';
import { buildTermsSections } from '@/shared/legal/termsContent';
import { LegalDocumentPage } from './LegalDocumentPage';

export function TermsPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useSubscriptionPrice();
  const sections = buildTermsSections({
    amountKopecks: isError ? null : (data?.amountKopecks ?? null),
    durationDays: isError ? null : (data?.durationDays ?? null),
  });
  return (
    <LegalDocumentPage
      title="РЈСЃР»РѕРІРёСЏ"
      onBack={() => navigate('/settings')}
      sections={sections}
      loadingHint={
        isLoading ? 'Р—Р°РіСЂСѓР¶Р°РµРј Р°РєС‚СѓР°Р»СЊРЅС‹Р№ С‚Р°СЂРёС„вЂ¦' : null
      }
    />
  );
}
```

While loading, still call `buildTermsSections` with nulls so fallback text shows, plus loadingHint вЂ” acceptable per spec.

`PrivacyPage.tsx`: same shell with `buildPrivacySections()`, title В«РџСЂРёРІР°С‚РЅРѕСЃС‚СЊВ».

`index.ts`: export `TermsPage`, `PrivacyPage`.

- [ ] **Step 3: Router**

Import Terms/Privacy. Add **without** ProfileGuard (same level as `/login`):

```tsx
{ path: '/legal/terms', element: <TermsPage /> },
{ path: '/legal/privacy', element: <PrivacyPage /> },
```

- [ ] **Step 4: Settings links**

In В«Рћ РїСЂРёР»РѕР¶РµРЅРёРёВ», after В«РќРѕРІРѕСЃС‚РёВ» (before or after Telegram), add:

```tsx
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => navigate('/legal/terms')}
          >
            РЈСЃР»РѕРІРёСЏ
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Button>
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => navigate('/legal/privacy')}
          >
            РџСЂРёРІР°С‚РЅРѕСЃС‚СЊ
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Button>
```

- [ ] **Step 5: Verify**

Run: `pnpm --filter ai-food test -- src/shared/legal/termsContent.test.ts src/features/billing/api/billingApi.test.ts`  
Run: `pnpm --filter ai-food exec tsc --noEmit`  
Expected: PASS / no errors.

Smoke: open Settings в†’ РЈСЃР»РѕРІРёСЏ / РџСЂРёРІР°С‚РЅРѕСЃС‚СЊ в†’ Back returns to settings.

- [ ] **Step 6: Commit**

```bash
git add apps/ai-food/src/pages/legal apps/ai-food/src/app/router.tsx apps/ai-food/src/pages/settings/ui/SettingsPage.tsx
git commit -m "feat(ai-food): add terms and privacy pages in settings"
```
