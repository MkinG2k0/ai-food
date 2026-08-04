# Review package Task 5
BASE: 6f7f7044375474e52d352eb0d2ee663be2323e0c
HEAD: eb422bf3677792cc40a79566bd652fc886507d68

## Commits


## Stat
 .../specs/2026-08-04-promo-codes-design.md         | 120 +++++++++++++++++++++
 apps/ai-food/docs/AI-GATEWAY.md                    |   3 +-
 2 files changed, 122 insertions(+), 1 deletion(-)


## Diff
diff --git a/apps/ai-app/docs/superpowers/specs/2026-08-04-promo-codes-design.md b/apps/ai-app/docs/superpowers/specs/2026-08-04-promo-codes-design.md
new file mode 100644
index 0000000..7ece86b
--- /dev/null
+++ b/apps/ai-app/docs/superpowers/specs/2026-08-04-promo-codes-design.md
@@ -0,0 +1,120 @@
+# Promo Codes on Subscribe
+
+**Date:** 2026-08-04  
+**Status:** Approved тАФ implemented  
+**Repos:** `ai-app` (gateway) + `ai-food` (subscribe UI)  
+**Approach:** A тАФ hardcoded catalog on gateway; validate endpoint + discounted subscribe
+
+## Goal
+
+Let users enter a promo code on `/subscribe`, preview the discounted price, and pay the reduced amount through the existing T-Bank / mock flow. Catalog lives in gateway code (no DB).
+
+## Non-goals
+
+- Persisting promo usage or catalog in Postgres / Prisma
+- Per-user or global redemption limits
+- Admin UI for managing codes
+- Fixed-amount (ruble) discounts тАФ percent only
+- Changing license duration or guest quota rules
+
+## Product rules
+
+| Code (case-insensitive) | Discount |
+|-------------------------|----------|
+| `new80` | 80% |
+| `new50` | 50% |
+
+- **No usage limits** тАФ any authenticated user may apply a valid code on every new payment.
+- Normalize: `trim` + lowercase before lookup.
+- Empty / unknown code тЖТ reject (`INVALID_PROMO`); do not create a payment.
+- Missing `promoCode` on subscribe тЖТ full list price (unchanged behavior).
+
+**Price formula (kopecks):**
+
+```
+original = getSubscriptionPriceKopecks()
+final = max(1, floor(original * (100 - discountPercent) / 100))
+```
+
+Minimum **1** kopeck so T-Bank Init never receives `0`.
+
+## Architecture
+
+```mermaid
+sequenceDiagram
+  participant UI as ai-food /subscribe
+  participant GW as ai-app /billing
+  participant TB as T-Bank / mock
+
+  UI->>GW: POST /billing/promo/validate { promoCode }
+  GW-->>UI: originalAmount, finalAmount, discountPercent
+  UI->>UI: show strikethrough + discounted price
+  UI->>GW: POST /billing/subscribe { promoCode? }
+  GW->>GW: resolve same final amount
+  GW->>TB: Init(amount = final)
+  GW-->>UI: paymentUrl, amount, originalAmount, promoCode
+```
+
+Source of truth for discounts is **only** the gateway catalog. Client never computes the paid amount.
+
+## API
+
+### `POST /billing/promo/validate`
+
+- Auth: `X-User-Token`
+- Body: `{ "promoCode": string }`
+- Success `200`:
+
+```json
+{
+  "valid": true,
+  "code": "new80",
+  "discountPercent": 80,
+  "originalAmount": 10000,
+  "finalAmount": 2000
+}
+```
+
+- Failure: `400 INVALID_PROMO` (empty, whitespace-only, or unknown after normalize)
+
+### `POST /billing/subscribe` (extend)
+
+- Body may include optional `promoCode`.
+- On valid promo: `Payment.amount = finalAmount`; Init/mock uses that amount.
+- On invalid promo: `400 INVALID_PROMO`, no `Payment` row.
+- Response adds: `amount`, `originalAmount`, `promoCode` (`null` if none). Existing `paymentUrl` / `paymentId` unchanged.
+
+No Prisma migration: do not store promo on `Payment`.
+
+## Code map
+
+| Area | Change |
+|------|--------|
+| `apps/ai-app/src/lib/promos.ts` | Catalog + `resolvePromo(code)` / amount helper |
+| `apps/ai-app/src/routes/billing.ts` | `POST /promo/validate`; subscribe reads `promoCode` |
+| `apps/ai-app` tests | Unit + route cases below |
+| `apps/ai-food` billing API | `validatePromo`, `subscribe(promoCode?)` |
+| `apps/ai-food` `SubscribePage` | Input + Apply + price preview |
+
+## UI (`/subscribe`)
+
+- Under the price block: text field ┬л╨Я╤А╨╛╨╝╨╛╨║╨╛╨┤┬╗ + button ┬л╨Я╤А╨╕╨╝╨╡╨╜╨╕╤В╤М┬╗.
+- Before apply: show full price (current copy; after apply use amounts from validate).
+- After successful apply: strikethrough original, show `finalAmount`, indicate percent off; keep applied code in state.
+- Invalid code: error toast / field error; clear applied discount.
+- If the user edits the field after a successful apply, clear applied state until they Apply again.
+- ┬л╨Ю╨┐╨╗╨░╤В╨╕╤В╤М┬╗ sends `promoCode` only when apply succeeded for the current field value.
+- Unauthenticated: same as pay today тАФ validate/subscribe need login (redirect / existing copy).
+
+## Testing
+
+- `new80` / `new50` тЖТ correct `finalAmount` for default and custom `SUBSCRIPTION_PRICE_KOPECKS`
+- ` New80 ` normalizes and succeeds
+- Unknown / empty тЖТ `INVALID_PROMO`
+- Subscribe with promo тЖТ `Payment.amount` equals discounted amount
+- Subscribe without promo тЖТ full price
+- Subscribe with bad promo тЖТ 400, no payment created
+
+## Env / ops
+
+No new env vars. Codes change by editing `promos.ts` and redeploying gateway.
diff --git a/apps/ai-food/docs/AI-GATEWAY.md b/apps/ai-food/docs/AI-GATEWAY.md
index 36b44ec..55b10ab 100644
--- a/apps/ai-food/docs/AI-GATEWAY.md
+++ b/apps/ai-food/docs/AI-GATEWAY.md
@@ -62,21 +62,22 @@ ai-app (openrouter-gateway)
 ## ╨н╨╜╨┤╨┐╨╛╨╕╨╜╤В╤Л gateway
 
 | ╨Ь╨╡╤В╨╛╨┤ | ╨Я╤Г╤В╤М | Auth | ╨Ч╨░╨╝╨╡╤В╨║╨╕ |
 |-------|------|------|---------|
 | `GET` | `/health` | ╨╜╨╡╤В | `{ "status": "ok" }` |
 | `POST` | `/auth/telegram/start` | ╨╜╨╡╤В* | `{ challengeId, botDeepLink, expiresAt }` тАФ ╤Б╤В╨░╤А╤В bot deep-link login |
 | `GET` | `/auth/telegram/status?challengeId=` | ╨╜╨╡╤В* | `{ status: "pending" \| "expired" }` ╨╕╨╗╨╕ `{ status: "ok", token, user }` |
 | `POST` | `/telegram/webhook` | `X-Telegram-Bot-Api-Secret-Token` | Telegram Bot API updates; ╨┐╨╛╨┤╤В╨▓╨╡╤А╨╢╨┤╨╡╨╜╨╕╨╡ challenge |
 | `GET` | `/auth/me` | `X-User-Token` | ╨Я╤А╨╛╤Д╨╕╨╗╤М + `subscriptionExpiresAt` / `hasActiveSubscription` |
 | `GET` | `/usage` | device (+ optional JWT) | ╨Ъ╨▓╨╛╤В╨░: unlimited **╤В╨╛╨╗╤М╨║╨╛** ╨┐╤А╨╕ active ╨╗╨╕╤Ж╨╡╨╜╨╖╨╕╨╕ |
-| `POST` | `/billing/subscribe` | `X-User-Token` | T-Bank Init / mock |
+| `POST` | `/billing/promo/validate` | `X-User-Token` | ╨Я╤А╨╛╨▓╨╡╤А╨║╨░ ╨┐╤А╨╛╨╝╨╛╨║╨╛╨┤╨░ ╨╕ ╤Ж╨╡╨╜╨░ ╤Б╨╛ ╤Б╨║╨╕╨┤╨║╨╛╨╣ |
+| `POST` | `/billing/subscribe` | `X-User-Token` | T-Bank Init / mock; ╨╛╨┐╤Ж╨╕╨╛╨╜╨░╨╗╤М╨╜╨╛ `{ promoCode }`; ╨╛╤В╨▓╨╡╤В: `amount`, `originalAmount`, `promoCode` |
 | `POST` | `/billing/tbank/notification` | Token T-Bank | ╨Р╨║╤В╨╕╨▓╨░╤Ж╨╕╤П ╨╗╨╕╤Ж╨╡╨╜╨╖╨╕╨╕ |
 | `GET` | `/billing/status` | `X-User-Token` | ╨б╤В╨░╤В╤Г╤Б ╨╗╨╕╤Ж╨╡╨╜╨╖╨╕╨╕ |
 | `POST` | `/billing/sync` | `X-User-Token` | GetState / mock confirm |
 | `GET` | `/v1/models` | ╨┤╨░* | ╤Б╨┐╨╕╤Б╨╛╨║ ╨╝╨╛╨┤╨╡╨╗╨╡╨╣ OpenRouter |
 | `POST` | `/v1/embeddings` | ╨┤╨░* | embeddings |
 | `POST` | `/v1/chat/completions` | ╨┤╨░* + quota | JSON ╨╕╨╗╨╕ SSE; `402 QUOTA_EXCEEDED` |
 
 \* Gateway API key: `Authorization: Bearer <API_KEY>` ╨╕╨╗╨╕ `X-API-Key`, ╤В╨╛╨╗╤М╨║╨╛ ╨╡╤Б╨╗╨╕ ╨╖╨░╨┤╨░╨╜ `API_KEY`.
 
 **╨Т╨░╨╢╨╜╨╛:** ╨╗╨╛╨│╨╕╨╜ тЙа unlimited. Unlimited AI ╤В╨╛╨╗╤М╨║╨╛ ╨┐╤А╨╕ `hasActiveSubscription` (╤Б╨╝. [SUBSCRIPTION.md](./SUBSCRIPTION.md)).

