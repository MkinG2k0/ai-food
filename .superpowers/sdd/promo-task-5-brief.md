### Task 5: Spec status + gateway doc touch-up

**Files:**
- Modify: `apps/ai-app/docs/superpowers/specs/2026-08-04-promo-codes-design.md` (Status в†’ Approved вЂ” implemented, or leave Approved вЂ” plan executed after verification)
- Modify: `apps/ai-food/docs/AI-GATEWAY.md` вЂ” add `POST /billing/promo/validate` to the billing table

- [ ] **Step 1: Update AI-GATEWAY.md billing table**

Add row:

| `POST` | `/billing/promo/validate` | `X-User-Token` | РџСЂРѕРІРµСЂРєР° РїСЂРѕРјРѕРєРѕРґР° Рё С†РµРЅР° СЃРѕ СЃРєРёРґРєРѕР№ |

Note that `/billing/subscribe` accepts optional `promoCode` and returns `amount` / `originalAmount` / `promoCode`.

- [ ] **Step 2: Set spec Status**

Change header Status to: `Approved вЂ” implemented`

- [ ] **Step 3: Commit**

```bash
git add apps/ai-app/docs/superpowers/specs/2026-08-04-promo-codes-design.md apps/ai-food/docs/AI-GATEWAY.md
git commit -m "$(cat <<'EOF'
docs: document promo validate endpoint and mark promo spec implemented

EOF
)"
```

---
