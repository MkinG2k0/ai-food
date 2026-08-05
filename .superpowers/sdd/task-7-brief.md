### Task 7: Full regression

**Files:** none (verify only)

- [ ] **Step 1: Run ai-app tests**

```bash
cd apps/ai-app && pnpm test
```

Expected: all PASS.

- [ ] **Step 2: Typecheck ai-app**

```bash
cd apps/ai-app && pnpm type-check
```

Expected: exits 0.

- [ ] **Step 3: Confirm no leftover hardcoded catalog**

```bash
rg "new80|new50|PROMOS = new Map" apps/ai-app/src --glob '!*.test.ts'
```

Expected: no matches in non-test source (tests may still seed mock `new80`/`new50` for fixtures).

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| `PromoCode` model + migration, no seed | 1 |
| Remove hardcoded map; DB lookup | 2 |
| Billing validate/subscribe use DB | 3 |
| Admin GET/POST/DELETE promos | 4 |
| Duplicate 409, validation 1вЂ“99 | 4 |
| Delete `{ ok: true }` | 4 |
| ai-web gateway proxy | 5 |
| Promos card on pricing page | 6 |
| Empty catalog / no new80 seed in prod | 1 + 2 |
| Formula min 1 kopeck | 2 (unchanged helper) |
| No ai-food / sidebar changes | вЂ” (explicit non-goals) |
