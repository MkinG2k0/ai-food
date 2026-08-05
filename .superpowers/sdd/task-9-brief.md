### Task 9: Legal privacy (and terms touch) updates

**Files:**
- Modify: `apps/ai-web/src/lib/legal/privacyContent.ts`
- Modify: `apps/ai-web/src/lib/legal/legalConfig.ts` (`revisionDate: '2026-08-06'`)
- Modify: `apps/ai-web/src/lib/legal/termsContent.ts` вЂ” one sentence that account use requires consent to data processing per Privacy Policy (if not already)

**Interfaces:**
- Section 2 paragraphs must explicitly list:
  - Telegram account fields
  - deviceId
  - Usage events: analyze by photo/text/photo+text, refine, manual, barcode (fact+time; not photo/text payloads in UsageEvent)
  - Payments / subscription
  - Technical API logs
  - Local-only: diary, РљР‘Р–РЈ profile on device
  - First-login consent required; without consent account features unavailable

- [ ] **Step 1: Rewrite section 2 (+ add consent subsection in section 4 if needed)**

Replace vague diary-on-server implications with clear local vs server split per spec.

- [ ] **Step 2: Bump revisionDate**

- [ ] **Step 3: Spot-check pages render** (optional `pnpm --filter ai-web type-check`)

- [ ] **Step 4: Commit**

```bash
git add apps/ai-web/src/lib/legal
git commit -m "docs(ai-web): privacy copy for usage analytics and consent"
```

---

## Spec coverage checklist

| Spec item | Task |
|-----------|------|
| User.dataConsentAt/Version | 1, 3 |
| Typed UsageEvent kinds + quota | 2, 7 |
| POST /auth/consent | 3, 8 |
| POST /usage/event manual/barcode | 4, 7 |
| Admin list + detail | 5, 6 |
| Stats analyze* | 5 |
| Consent UI /consent | 8 |
| Privacy text | 9 |
| Forward-only / no diary sync | Global + 9 |

## Self-review notes

- No TBD placeholders; default missing header = `analyze`, unknown = `other`.
- `GET /admin/users/:id` must not break `POST .../subscription` (method+path distinct).
- ai-food package filter: confirm `name` in `apps/ai-food/package.json` before running pnpm filter commands.
