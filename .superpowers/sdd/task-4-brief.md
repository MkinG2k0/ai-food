### Task 4: Legal content modules

**Files:**
- Create: `apps/ai-food/src/shared/legal/types.ts`
- Create: `apps/ai-food/src/shared/legal/legalConfig.ts`
- Create: `apps/ai-food/src/shared/legal/termsContent.ts`
- Create: `apps/ai-food/src/shared/legal/privacyContent.ts`
- Create: `apps/ai-food/src/shared/legal/termsContent.test.ts`

**Interfaces:**
- Produces:
  - `LegalSection = { title: string; paragraphs: string[] }`
  - `legalConfig` with placeholders + `revisionDate: '2026-08-04'`
  - `formatSellerBlock(): string`
  - `buildTermsSections(opts: { amountKopecks: number | null; durationDays: number | null }): LegalSection[]`
  - `buildPrivacySections(): LegalSection[]`

- [ ] **Step 1: Write failing unit test for price interpolation**

```ts
// apps/ai-food/src/shared/legal/termsContent.test.ts
import { describe, it, expect } from 'vitest';
import { buildTermsSections } from './termsContent';

describe('buildTermsSections', () => {
  it('interpolates rubles and duration when price known', () => {
    const sections = buildTermsSections({
      amountKopecks: 10_000,
      durationDays: 365,
    });
    const priceSection = sections.find((s) => s.title.includes('Р¦РµРЅР°'));
    expect(priceSection?.paragraphs.join(' ')).toMatch(/100/);
    expect(priceSection?.paragraphs.join(' ')).toMatch(/365/);
  });

  it('uses fallback wording when price null', () => {
    const sections = buildTermsSections({
      amountKopecks: null,
      durationDays: null,
    });
    const priceSection = sections.find((s) => s.title.includes('Р¦РµРЅР°'));
    expect(priceSection?.paragraphs.join(' ')).toMatch(
      /Р°РєС‚СѓР°Р»СЊРЅ(Р°СЏ|С‹Р№) (С†РµРЅР°|С‚Р°СЂРёС„)|СЌРєСЂР°РЅРµ РѕРїР»Р°С‚С‹/i,
    );
  });
});
```

- [ ] **Step 2: Run test вЂ” expect FAIL**

Run: `pnpm --filter ai-food test -- src/shared/legal/termsContent.test.ts`

Expected: FAIL (module missing).

- [ ] **Step 3: Implement modules**

`types.ts`:

```ts
export type LegalSection = {
  title: string;
  paragraphs: string[];
};
```

`legalConfig.ts`:

```ts
export const legalConfig = {
  revisionDate: '2026-08-04',
  sellerName: '[Р¤РРћ РРџ]',
  inn: '[РРќРќ]',
  ogrnip: '[РћР“Р РќРРџ]',
  address: '[РђРґСЂРµСЃ]',
  email: '[email]',
  phone: '[С‚РµР»РµС„РѕРЅ]',
  productName: 'AI Food',
  telegramSupport: 'https://t.me/double_cumboy',
} as const;

export function formatSellerBlock(): string {
  const c = legalConfig;
  return `РРЅРґРёРІРёРґСѓР°Р»СЊРЅС‹Р№ РїСЂРµРґРїСЂРёРЅРёРјР°С‚РµР»СЊ ${c.sellerName}, РРќРќ ${c.inn}, РћР“Р РќРРџ ${c.ogrnip}, Р°РґСЂРµСЃ: ${c.address}, email: ${c.email}, С‚РµР»РµС„РѕРЅ: ${c.phone}.`;
}
```

`termsContent.ts` вЂ” implement `buildTermsSections` with these sections (titles exact enough for the test `.includes('Р¦РµРЅР°')`):

1. **РСЃРїРѕР»РЅРёС‚РµР»СЊ** вЂ” `formatSellerBlock()`, status РРџ, product `AI Food`.
2. **РџСЂРµРґРјРµС‚ РґРѕРіРѕРІРѕСЂР°** вЂ” С†РёС„СЂРѕРІР°СЏ СѓСЃР»СѓРіР°: Р»РёС†РµРЅР·РёСЏ РЅР° РёСЃРїРѕР»СЊР·РѕРІР°РЅРёРµ РїСЂРёР»РѕР¶РµРЅРёСЏ AI Food СЃ Р±РµР·Р»РёРјРёС‚РЅС‹Рј AI-Р°РЅР°Р»РёР·РѕРј С„РѕС‚Рѕ/РѕРїРёСЃР°РЅРёСЏ РµРґС‹ Рё AI-СѓС‚РѕС‡РЅРµРЅРёРµРј РЅР° СЃСЂРѕРє Р»РёС†РµРЅР·РёРё; РґРЅРµРІРЅРёРє/СЂСѓС‡РЅРѕР№ РІРІРѕРґ/С€С‚СЂРёС…РєРѕРґ РґРѕСЃС‚СѓРїРЅС‹ Р±РµР· РѕРїР»Р°С‚С‹.
3. **Р¦РµРЅР° Рё СЃСЂРѕРє** вЂ” if `amountKopecks != null && durationDays != null`: `РЎС‚РѕРёРјРѕСЃС‚СЊ Р»РёС†РµРЅР·РёРё СЃРѕСЃС‚Р°РІР»СЏРµС‚ ${Math.round(amountKopecks/100)} в‚Ѕ Р·Р° ${durationDays} РґРЅРµР№. РћРїР»Р°С‚Р° СЂР°Р·РѕРІР°СЏ, Р±РµР· Р°РІС‚РѕРїСЂРѕРґР»РµРЅРёСЏ.` Else: `РђРєС‚СѓР°Р»СЊРЅР°СЏ С†РµРЅР° Рё СЃСЂРѕРє СѓРєР°Р·Р°РЅС‹ РЅР° СЌРєСЂР°РЅРµ РѕРїР»Р°С‚С‹ РІ РїСЂРёР»РѕР¶РµРЅРёРё.`
4. **РђРєС†РµРїС‚ РѕС„РµСЂС‚С‹** вЂ” РѕРїР»Р°С‚Р° С‡РµСЂРµР· РїР»Р°С‚С‘Р¶РЅС‹Р№ СЃРµСЂРІРёСЃ TвЂ‘Bank (РѕРїР»Р°С‚Р° РїРѕ СЃСЃС‹Р»РєРµ) РѕР·РЅР°С‡Р°РµС‚ РїРѕР»РЅРѕРµ РїСЂРёРЅСЏС‚РёРµ СѓСЃР»РѕРІРёР№ РЅР°СЃС‚РѕСЏС‰РµР№ РѕС„РµСЂС‚С‹.
5. **РџСЂРµРґРѕСЃС‚Р°РІР»РµРЅРёРµ РґРѕСЃС‚СѓРїР°** вЂ” РїРѕСЃР»Рµ РїРѕРґС‚РІРµСЂР¶РґРµРЅРёСЏ РїР»Р°С‚РµР¶Р° (`CONFIRMED`) Р»РёС†РµРЅР·РёСЏ Р°РєС‚РёРІРёСЂСѓРµС‚СЃСЏ РЅР° СѓРєР°Р·Р°РЅРЅС‹Р№ СЃСЂРѕРє; СЃС‚Р°С‚СѓСЃ РґРѕСЃС‚СѓРїРµРЅ РІ РїСЂРёР»РѕР¶РµРЅРёРё.
6. **РћРіСЂР°РЅРёС‡РµРЅРёРµ РѕС‚РІРµС‚СЃС‚РІРµРЅРЅРѕСЃС‚Рё** вЂ” СЃРµСЂРІРёСЃ РЅРµ СЏРІР»СЏРµС‚СЃСЏ РјРµРґРёС†РёРЅСЃРєРѕР№ СѓСЃР»СѓРіРѕР№; РѕС†РµРЅРєРё РљР‘Р–РЈ Рё СЃРѕСЃС‚Р°РІР° РЅРѕСЃСЏС‚ РїСЂРёР±Р»РёР·РёС‚РµР»СЊРЅС‹Р№ С…Р°СЂР°РєС‚РµСЂ Рё РЅРµ Р·Р°РјРµРЅСЏСЋС‚ РєРѕРЅСЃСѓР»СЊС‚Р°С†РёСЋ СЃРїРµС†РёР°Р»РёСЃС‚Р°.
7. **Р’РѕР·РІСЂР°С‚ РґРµРЅРµР¶РЅС‹С… СЃСЂРµРґСЃС‚РІ** вЂ” РїСЂРё РїРѕР»РЅРѕРј РІРѕР·РІСЂР°С‚Рµ РїР»Р°С‚РµР¶Р° (`REFUNDED`) Р»РёС†РµРЅР·РёСЏ РґРµР°РєС‚РёРІРёСЂСѓРµС‚СЃСЏ; С‡Р°СЃС‚РёС‡РЅС‹Р№ РІРѕР·РІСЂР°С‚ вЂ” РїРѕ СЃРѕРіР»Р°СЃРѕРІР°РЅРёСЋ СЃ РёСЃРїРѕР»РЅРёС‚РµР»РµРј С‡РµСЂРµР· РєРѕРЅС‚Р°РєС‚С‹ РЅРёР¶Рµ.
8. **РџСЂРµС‚РµРЅР·РёРё** вЂ” РЅР°РїСЂР°РІР»СЏС‚СЊ РЅР° `legalConfig.email` / Telegram `legalConfig.telegramSupport`.
9. **Р РµРєРІРёР·РёС‚С‹** вЂ” repeat `formatSellerBlock()`.
10. Optional short disclaimer paragraph in last section: С‚РµРєСЃС‚С‹-С€Р°Р±Р»РѕРЅС‹; РїРµСЂРµРґ РїСЂРѕРґРѕРј Р·Р°РїРѕР»РЅРёС‚СЊ РїР»РµР№СЃС…РѕР»РґРµСЂС‹.

`privacyContent.ts` вЂ” `buildPrivacySections()` sections:

1. **РћРїРµСЂР°С‚РѕСЂ** вЂ” РРџ + `formatSellerBlock()`; РѕР±СЂР°С‰РµРЅРёСЏ РїРѕ РџР”РЅ РЅР° email/С‚РµР»РµС„РѕРЅ РёР· РєРѕРЅС„РёРіР°.
2. **РљР°С‚РµРіРѕСЂРёРё РґР°РЅРЅС‹С…** вЂ” Telegram ID, РёРјСЏ, С„Р°РјРёР»РёСЏ, username, URL С„РѕС‚Рѕ РїСЂРѕС„РёР»СЏ; РёРґРµРЅС‚РёС„РёРєР°С‚РѕСЂ СѓСЃС‚СЂРѕР№СЃС‚РІР° (deviceId); СЃРІРµРґРµРЅРёСЏ Рѕ РїР»Р°С‚РµР¶Р°С… (СЃСѓРјРјР°, СЃС‚Р°С‚СѓСЃ, РёРґРµРЅС‚РёС„РёРєР°С‚РѕСЂС‹ РїР»Р°С‚РµР¶Р° Р±РµР· РґР°РЅРЅС‹С… РєР°СЂС‚С‹); РёР·РѕР±СЂР°Р¶РµРЅРёСЏ РµРґС‹ Рё С‚РµРєСЃС‚РѕРІС‹Рµ РѕРїРёСЃР°РЅРёСЏ, РїРµСЂРµРґР°РІР°РµРјС‹Рµ РґР»СЏ AI-Р°РЅР°Р»РёР·Р° РЅР° РІСЂРµРјСЏ РѕР±СЂР°Р±РѕС‚РєРё; РґР°РЅРЅС‹Рµ РїСЂРѕС„РёР»СЏ Рё РґРЅРµРІРЅРёРєР°, С…СЂР°РЅРёРјС‹Рµ Р»РѕРєР°Р»СЊРЅРѕ РЅР° СѓСЃС‚СЂРѕР№СЃС‚РІРµ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ.
3. **Р¦РµР»Рё РѕР±СЂР°Р±РѕС‚РєРё** вЂ” СЃРѕР·РґР°РЅРёРµ Рё РІРµРґРµРЅРёРµ Р°РєРєР°СѓРЅС‚Р°; СѓС‡С‘С‚ РєРІРѕС‚ Р±РµСЃРїР»Р°С‚РЅС‹С… РіРµРЅРµСЂР°С†РёР№; РїСЂРёС‘Рј РѕРїР»Р°С‚С‹ Рё РїСЂРµРґРѕСЃС‚Р°РІР»РµРЅРёРµ Р»РёС†РµРЅР·РёРё; AI-Р°РЅР°Р»РёР· РїРёС‚Р°РЅРёСЏ; РѕР±РµСЃРїРµС‡РµРЅРёРµ СЂР°Р±РѕС‚С‹ Рё Р±РµР·РѕРїР°СЃРЅРѕСЃС‚Рё СЃРµСЂРІРёСЃР°.
4. **РџСЂР°РІРѕРІС‹Рµ РѕСЃРЅРѕРІР°РЅРёСЏ** вЂ” РёСЃРїРѕР»РЅРµРЅРёРµ РґРѕРіРѕРІРѕСЂР° (РѕС„РµСЂС‚Р°); СЃРѕРіР»Р°СЃРёРµ СЃСѓР±СЉРµРєС‚Р° РіРґРµ С‚СЂРµР±СѓРµС‚СЃСЏ; РёРЅС‹Рµ РѕСЃРЅРѕРІР°РЅРёСЏ, РїСЂРµРґСѓСЃРјРѕС‚СЂРµРЅРЅС‹Рµ 152вЂ‘Р¤Р—.
5. **РџРµСЂРµРґР°С‡Р° С‚СЂРµС‚СЊРёРј Р»РёС†Р°Рј** вЂ” TвЂ‘Bank (РїР»Р°С‚РµР¶Рё); OpenRouter Рё РёРЅС‹Рµ AI-РїСЂРѕРІР°Р№РґРµСЂС‹ (Р°РЅР°Р»РёР· РєРѕРЅС‚РµРЅС‚Р°); С…РѕСЃС‚РёРЅРі/РёРЅС„СЂР°СЃС‚СЂСѓРєС‚СѓСЂР° gateway.
6. **РўСЂР°РЅСЃРіСЂР°РЅРёС‡РЅР°СЏ РїРµСЂРµРґР°С‡Р°** вЂ” РґР°РЅРЅС‹Рµ РґР»СЏ AI-Р°РЅР°Р»РёР·Р° РјРѕРіСѓС‚ РїРµСЂРµРґР°РІР°С‚СЊСЃСЏ РёРЅРѕСЃС‚СЂР°РЅРЅС‹Рј РїСЂРѕРІР°Р№РґРµСЂР°Рј; РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ СѓРІРµРґРѕРјР»С‘РЅ РЅР°СЃС‚РѕСЏС‰РµР№ РїРѕР»РёС‚РёРєРѕР№.
7. **РЎСЂРѕРєРё Рё Р·Р°С‰РёС‚Р°** вЂ” С…СЂР°РЅРµРЅРёРµ РЅРµ РґРѕР»СЊС€Рµ, С‡РµРј С‚СЂРµР±СѓСЋС‚ С†РµР»Рё Рё Р·Р°РєРѕРЅ; С‚РµС…РЅРёС‡РµСЃРєРёРµ Рё РѕСЂРіР°РЅРёР·Р°С†РёРѕРЅРЅС‹Рµ РјРµСЂС‹ (РѕРіСЂР°РЅРёС‡РµРЅРёРµ РґРѕСЃС‚СѓРїР°, Р·Р°С‰РёС‰С‘РЅРЅС‹Рµ РєР°РЅР°Р»С‹) РІ РѕР±С‰РµРј РІРёРґРµ.
8. **РџСЂР°РІР° СЃСѓР±СЉРµРєС‚Р°** вЂ” РґРѕСЃС‚СѓРї, СѓС‚РѕС‡РЅРµРЅРёРµ, СѓРґР°Р»РµРЅРёРµ, РѕС‚Р·С‹РІ СЃРѕРіР»Р°СЃРёСЏ вЂ” С‡РµСЂРµР· РєРѕРЅС‚Р°РєС‚С‹ РѕРїРµСЂР°С‚РѕСЂР°.
9. **Р РµРєРІРёР·РёС‚С‹ РѕРїРµСЂР°С‚РѕСЂР°** вЂ” `formatSellerBlock()`.

Keep paragraphs as plain strings (no markdown).

- [ ] **Step 4: Run test вЂ” expect PASS**

Run: `pnpm --filter ai-food test -- src/shared/legal/termsContent.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/ai-food/src/shared/legal
git commit -m "feat(ai-food): add legal terms and privacy content modules"
```
