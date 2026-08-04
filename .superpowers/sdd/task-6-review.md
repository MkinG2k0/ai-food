# Task 6 Review: Telegram webhook + Flash-Call removal

**Scope:** `f6fcdb4dabf107c349ee736d53495553238255cb..b3bacd98f22c41278afb8a3741f72528536b36cb`  
**Brief:** `.superpowers/sdd/task-6-brief.md`  
**Report:** `.superpowers/sdd/task-6-report.md`

## Verdict

- **Spec:** ✅
- **Quality:** **Approved**
- **Critical:** 0
- **Important:** 0

## Spec compliance

- ✅ `POST /telegram/webhook` is mounted and rejects a missing or incorrect `X-Telegram-Bot-Api-Secret-Token` with 401.
- ✅ `/start <nonce>` resolves a pending challenge and sends a confirmation button with `callback_data: ok:<challengeId>`.
- ✅ `ok:<challengeId>` resolves the challenge by ID, upserts the user by `telegramId`, optionally associates the device, signs a user token, and calls `confirmLoginChallenge`.
- ✅ Valid webhook requests are acknowledged with HTTP 200 even when downstream Bot API handling fails, preventing retry storms.
- ✅ Startup calls `setWebhook` after listening when bot token, `TELEGRAM_WEBHOOK_SECRET`, and `PUBLIC_GATEWAY_URL` are configured.
- ✅ `flashcall.ts`, `flashcallChallenge.ts`, `phone.ts`, and their tests are deleted; no Flash-Call or phone references remain under `apps/ai-app/src`.
- ✅ Telegram integration remains a thin native-`fetch` Bot API client; no bot framework was added.

## Issues (confidence ≥ 80)

None.

## Verification

```text
pnpm exec vitest run src/routes/telegramWebhook.test.ts
Test Files  1 passed (1)
Tests       6 passed (6)

pnpm test
Test Files  15 passed (15)
Tests       78 passed (78)

pnpm type-check
passed

git diff --check f6fcdb4dabf107c349ee736d53495553238255cb...HEAD
passed
```

The small `billing.ts` change is behavior-preserving: the preceding confirmed-payment early return already narrows this path to non-confirmed payments.

## Decision

**Approved.** Task 6 satisfies the webhook, confirmation, startup registration, cleanup, and thin-client requirements with no high-confidence issues requiring changes.
