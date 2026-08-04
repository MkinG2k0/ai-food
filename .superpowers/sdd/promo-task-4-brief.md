### Task 4: Subscribe page promo UI

**Files:**
- Modify: `apps/ai-food/src/pages/subscribe/ui/SubscribePage.tsx`

**Interfaces:**
- Consumes: `validatePromo`, `subscribe(promoCode?)` from `@/features/billing`
- Produces: UI state for draft code, applied promo, price display

- [ ] **Step 1: Update imports and state on the main (non-success/fail) path**

In `SubscribePage.tsx`:

1. Import `validatePromo` alongside `subscribe`.
2. Add state (only needed on the pay form; keep success/fail branches unchanged):

```ts
  const [promoInput, setPromoInput] = useState('');
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState<{
    code: string;
    discountPercent: number;
    originalAmount: number;
    finalAmount: number;
  } | null>(null);
```

3. Keep `PRICE_RUB = 100` as fallback display before apply. After apply, display from `applied` (kopecks в†’ rubles: `amount / 100`).

- [ ] **Step 2: Wire Apply + Pay handlers**

```ts
  function clearAppliedIfEdited(next: string) {
    setPromoInput(next);
    if (applied && next.trim().toLowerCase() !== applied.code) {
      setApplied(null);
    }
  }

  async function handleApplyPromo() {
    if (!userToken) {
      navigate('/login', { replace: true, state: { from: '/subscribe' } });
      return;
    }
    setApplying(true);
    try {
      const result = await validatePromo(promoInput);
      setApplied({
        code: result.code,
        discountPercent: result.discountPercent,
        originalAmount: result.originalAmount,
        finalAmount: result.finalAmount,
      });
      setPromoInput(result.code);
      toast.success(`РЎРєРёРґРєР° ${result.discountPercent}% РїСЂРёРјРµРЅРµРЅР°`);
    } catch (err) {
      setApplied(null);
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'РќРµРІРµСЂРЅС‹Р№ РїСЂРѕРјРѕРєРѕРґ';
      toast.error(message);
    } finally {
      setApplying(false);
    }
  }

  async function handlePay() {
    if (!userToken) {
      navigate('/login', { replace: true, state: { from: '/subscribe' } });
      return;
    }
    setPaying(true);
    try {
      const result = await subscribe(applied?.code);
      openPaymentUrl(result.paymentUrl);
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕР·РґР°С‚СЊ РїР»Р°С‚С‘Р¶';
      toast.error(message);
      setPaying(false);
    }
  }
```

- [ ] **Step 3: Render price + promo field**

Replace the price `<section>` and insert promo UI before the pay button on the main form:

```tsx
      <section className="space-y-3">
        {applied ? (
          <p className="text-3xl font-semibold tabular-nums">
            <span className="mr-2 text-base font-normal text-muted-foreground line-through">
              {(applied.originalAmount / 100).toLocaleString('ru-RU')} в‚Ѕ
            </span>
            {(applied.finalAmount / 100).toLocaleString('ru-RU')} в‚Ѕ
            <span className="ml-2 text-base font-normal text-muted-foreground">
              / РіРѕРґ (в€’{applied.discountPercent}%)
            </span>
          </p>
        ) : (
          <p className="text-3xl font-semibold tabular-nums">
            {PRICE_RUB.toLocaleString('ru-RU')} в‚Ѕ
            <span className="ml-2 text-base font-normal text-muted-foreground">
              / РіРѕРґ
            </span>
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Р Р°Р·РѕРІР°СЏ РѕРїР»Р°С‚Р° вЂ” РґРѕСЃС‚СѓРї Рє AI РЅР° 365 РґРЅРµР№. Р‘РµР· Р°РІС‚РѕСЃРїРёСЃР°РЅРёР№.
        </p>
      </section>

      {/* existing "Р’С…РѕРґРёС‚ РІ Р»РёС†РµРЅР·РёСЋ" / "Р’СЃРµРіРґР° Р±РµСЃРїР»Р°С‚РЅРѕ" sections stay */}

      <section className="space-y-2">
        <label htmlFor="promo" className="text-sm font-medium">
          РџСЂРѕРјРѕРєРѕРґ
        </label>
        <div className="flex gap-2">
          <input
            id="promo"
            value={promoInput}
            onChange={(e) => clearAppliedIfEdited(e.target.value)}
            placeholder="Р’РІРµРґРёС‚Рµ РєРѕРґ"
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            autoComplete="off"
          />
          <Button
            type="button"
            variant="secondary"
            disabled={applying || !promoInput.trim()}
            onClick={() => void handleApplyPromo()}
          >
            {applying ? 'вЂ¦' : 'РџСЂРёРјРµРЅРёС‚СЊ'}
          </Button>
        </div>
      </section>
```

Confirm `Button` supports `variant="secondary"` in this repo; if not, omit `variant` or use the closest existing variant from `button.tsx`.

Keep the existing pay `Button` calling `handlePay`.

- [ ] **Step 4: Manual smoke (optional if no UI test harness)**

Run food + gateway locally (`pnpm dev` from monorepo root). On `/subscribe`: apply `new80` в†’ price 20 в‚Ѕ (if list price 100 в‚Ѕ); pay in mock в†’ payment amount 2000 kopecks.

Automated gate for this task:

Run: `cd apps/ai-food && pnpm exec vitest run src/features/billing/api/billingApi.test.ts`

Expected: PASS (UI is covered by API contract + manual smoke)

- [ ] **Step 5: Commit**

```bash
git add apps/ai-food/src/pages/subscribe/ui/SubscribePage.tsx
git commit -m "$(cat <<'EOF'
feat(food): promo code field and discounted price on subscribe

EOF
)"
```

---
