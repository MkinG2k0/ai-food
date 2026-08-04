BASE: 81271edae76c333e7e08f264efbefe02136991a7
HEAD: 5dd6acb5cd67a13aec83a231c36e3779bed36470

5dd6acb docs: Telegram bot auth env and gateway contract
 apps/ai-app/.env.example        |  9 +++++++--
 apps/ai-food/.env.example       | 18 ++++++++++--------
 apps/ai-food/docs/AI-GATEWAY.md | 13 ++++++++++---
 docs/DOKPLOY.md                 |  8 +++++++-
 4 files changed, 34 insertions(+), 14 deletions(-)
diff --git a/apps/ai-app/.env.example b/apps/ai-app/.env.example
index fd2f9f9..6236801 100644
--- a/apps/ai-app/.env.example
+++ b/apps/ai-app/.env.example
@@ -19,12 +19,17 @@ OPENROUTER_API_KEY=your_key_here
 # DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require
 
 # JWT signing secret (min 32 chars) тАФ generate: openssl rand -base64 32
 # AUTH_SECRET=
 
-# Flash-Call provider key (server only тАФ never expose to Vite)
-# FLASHCALL_API_KEY=
+# Telegram bot auth (server only тАФ never expose to Vite)
+# TELEGRAM_BOT_TOKEN=
+# alias also accepted: AUTH_TELEGRAM_BOT_TOKEN=
+# TELEGRAM_BOT_USERNAME=
+# TELEGRAM_WEBHOOK_SECRET=
+# Public origin of this gateway (webhook URL base; not the frontend)
+# PUBLIC_GATEWAY_URL=http://127.0.0.1:3000
 
 # Guest analyze+refine free budget
 FREE_GENERATION_LIMIT=50
 # Extra generations after sign-in (summed with FREE_GENERATION_LIMIT тЖТ 150)
 AUTH_LOGIN_GENERATION_BONUS=100
diff --git a/apps/ai-food/.env.example b/apps/ai-food/.env.example
index 20dabd7..9f5c39b 100644
--- a/apps/ai-food/.env.example
+++ b/apps/ai-food/.env.example
@@ -9,21 +9,23 @@ VITE_AI_GATEWAY_URL=
 VITE_AI_GATEWAY_API_KEY=
 
 # ╨Ю╨┐╤Ж╨╕╨╛╨╜╨░╨╗╤М╨╜╨╛: legacy API base (axios client)
 # VITE_API_URL=http://localhost:3001
 
-# тФАтФАтФА Telegram Auth (╨║╨╗╨╕╨╡╨╜╤В) тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА
-# Username ╨▒╨╛╤В╨░ ╨▒╨╡╨╖ @: ╨╕╨╖ @BotFather (╨╜╨░╨┐╤А╨╕╨╝╨╡╤А my_food_bot)
-VITE_TELEGRAM_BOT_USERNAME=
+# тФАтФАтФА Telegram Auth (bot deep-link) тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА
+# ╨Ы╨╛╨│╨╕╨╜: POST /auth/telegram/start тЖТ ╨╛╤В╨║╤А╤Л╤В╤М botDeepLink тЖТ poll /auth/telegram/status.
+# Login Widget ╨╕ domain ╨▓ BotFather ╨╜╨╡ ╨╜╤Г╨╢╨╜╤Л.
+# ╨Ю╨┐╤Ж╨╕╨╛╨╜╨░╨╗╤М╨╜╨╛: username ╨▒╨╛╤В╨░ ╨▒╨╡╨╖ @ тАФ ╤В╨╛╨╗╤М╨║╨╛ ╨┤╨╗╤П ╨┐╨╛╨┤╨┐╨╕╤Б╨╕ ╨╜╨░ ╨║╨╜╨╛╨┐╨║╨╡ ┬л╨Т╨╛╨╣╤В╨╕ ╤З╨╡╤А╨╡╨╖ Telegram┬╗
+# VITE_TELEGRAM_BOT_USERNAME=
 
-# ╨Я╤Г╨▒╨╗╨╕╤З╨╜╤Л╨╣ URL ╨┐╤А╨╕╨╗╨╛╨╢╨╡╨╜╨╕╤П (Login Widget domain ╨▓ BotFather)
-# ╨б╨╡╨╣╤З╨░╤Б: ai-food-mobile.vercel.app
+# ╨Я╤Г╨▒╨╗╨╕╤З╨╜╤Л╨╣ URL ╤Д╤А╨╛╨╜╤В╨░ (╤А╨╡╨┤╨╕╤А╨╡╨║╤В╤Л ╨┐╨╛╤Б╨╗╨╡ ╨╛╨┐╨╗╨░╤В╤Л ╨╕ ╤В.╨┐.)
 VITE_APP_URL=https://ai-food-mobile.vercel.app
 
-# true = ╨║╨╜╨╛╨┐╨║╨░ ┬л╨Т╨╛╨╣╤В╨╕ (╨┤╨╡╨╝╨╛)┬╗ ╨╜╨░ /login; false = ╤В╨╛╨╗╤М╨║╨╛ ╤А╨╡╨░╨╗╤М╨╜╤Л╨╣ ╨▓╨╕╨┤╨╢╨╡╤В (╨║╨╛╨│╨┤╨░ ╨▒╤Г╨┤╨╡╤В)
+# true = ╨║╨╜╨╛╨┐╨║╨░ ┬л╨Т╨╛╨╣╤В╨╕ (╨┤╨╡╨╝╨╛)┬╗ ╨╜╨░ /login; false = ╤В╨╛╨╗╤М╨║╨╛ bot deep-link
 VITE_AUTH_MOCK=true
 
 # Server-side тЖТ apps/ai-app/.env only (never VITE_*):
-# DATABASE_URL=  AUTH_SECRET=  TELEGRAM_BOT_TOKEN=  FREE_GENERATION_LIMIT=50
-# SUBSCRIPTION_PRICE_KOPECKS=10000  SUBSCRIPTION_DURATION_DAYS=365
+# DATABASE_URL=  AUTH_SECRET=  TELEGRAM_BOT_TOKEN=  TELEGRAM_BOT_USERNAME=
+# TELEGRAM_WEBHOOK_SECRET=  PUBLIC_GATEWAY_URL=http://127.0.0.1:3000
+# FREE_GENERATION_LIMIT=50  SUBSCRIPTION_PRICE_KOPECKS=10000  SUBSCRIPTION_DURATION_DAYS=365
 # TBANK_TERMINAL_KEY=  TBANK_PASSWORD=  TBANK_API_URL=  TBANK_MOCK=true
 # PUBLIC_APP_URL=http://localhost:5173
diff --git a/apps/ai-food/docs/AI-GATEWAY.md b/apps/ai-food/docs/AI-GATEWAY.md
index e969253..36b44ec 100644
--- a/apps/ai-food/docs/AI-GATEWAY.md
+++ b/apps/ai-food/docs/AI-GATEWAY.md
@@ -43,25 +43,32 @@ ai-app (openrouter-gateway)
 | `VITE_AI_GATEWAY_URL` | тАФ (URL ╤Б╨╡╤А╨▓╨╕╤Б╨░) | ╨С╨░╨╖╨╛╨▓╤Л╨╣ URL gateway, ╨▒╨╡╨╖ `/v1` |
 | `VITE_AI_GATEWAY_API_KEY` | `API_KEY` | ╨Ю╨▒╤Й╨╕╨╣ ╤Б╨╡╨║╤А╨╡╤В ╨║╨╗╨╕╨╡╨╜╤В╨░; ╨╡╤Б╨╗╨╕ `API_KEY` ╨╜╨╡ ╨╖╨░╨┤╨░╨╜ ╨╜╨░ ╨▒╤Н╨║╨╡ тАФ auth ╨╛╤В╨║╨╗╤О╤З╤С╨╜ |
 | тАФ | `OPENROUTER_API_KEY` | ╨Ъ╨╗╤О╤З ╨┐╤А╨╛╨▓╨░╨╣╨┤╨╡╤А╨░ (╤В╨╛╨╗╤М╨║╨╛ ╨╜╨░ ╤Б╨╡╤А╨▓╨╡╤А╨╡) |
 | тАФ | `PORT` | HTTP-╨┐╨╛╤А╤В (╨┐╨╛ ╤Г╨╝╨╛╨╗╤З╨░╨╜╨╕╤О **3000**) |
 | тАФ | `OPENROUTER_HTTP_REFERER` / `OPENROUTER_APP_TITLE` | ╨Ю╨┐╤Ж╨╕╨╛╨╜╨░╨╗╤М╨╜╤Л╨╡ ╨╖╨░╨│╨╛╨╗╨╛╨▓╨║╨╕ ╨░╤В╤А╨╕╨▒╤Г╤Ж╨╕╨╕ OpenRouter |
-| тАФ | `DATABASE_URL`, `AUTH_SECRET`, `TELEGRAM_BOT_TOKEN` | Auth + ╨║╨▓╨╛╤В╨░ |
+| тАФ | `DATABASE_URL`, `AUTH_SECRET` | Auth + ╨║╨▓╨╛╤В╨░ |
+| тАФ | `TELEGRAM_BOT_TOKEN` (╨╕╨╗╨╕ `AUTH_TELEGRAM_BOT_TOKEN`), `TELEGRAM_BOT_USERNAME` | Bot deep-link login |
+| тАФ | `TELEGRAM_WEBHOOK_SECRET`, `PUBLIC_GATEWAY_URL` | Webhook `POST /telegram/webhook` + `setWebhook` ╨┐╤А╨╕ ╤Б╤В╨░╤А╤В╨╡ |
 | тАФ | `FREE_GENERATION_LIMIT` | Guest AI budget (default 50) |
 | тАФ | `AUTH_LOGIN_GENERATION_BONUS` | Extra AI after Telegram login (default 100; summed with free тЖТ 150) |
+| `VITE_TELEGRAM_BOT_USERNAME` (╨╛╨┐╤Ж.) | тАФ | ╨Я╨╛╨┤╨┐╨╕╤Б╤М ╨║╨╜╨╛╨┐╨║╨╕ ┬л╨Т╨╛╨╣╤В╨╕ ╤З╨╡╤А╨╡╨╖ Telegram┬╗ ╨╜╨░ ╤Д╤А╨╛╨╜╤В╨╡ |
 | тАФ | `SUBSCRIPTION_*`, `TBANK_*`, `PUBLIC_APP_URL` | ╨У╨╛╨┤╨╛╨▓╨░╤П ╨╗╨╕╤Ж╨╡╨╜╨╖╨╕╤П (╤Б╨╝. [SUBSCRIPTION.md](./SUBSCRIPTION.md)) |
 
+`PUBLIC_GATEWAY_URL` тАФ ╨┐╤Г╨▒╨╗╨╕╤З╨╜╤Л╨╣ origin **gateway** (webhook). `PUBLIC_APP_URL` тАФ origin **╤Д╤А╨╛╨╜╤В╨░** (T-Bank redirects).
+
 ╨Ы╨╛╨║╨░╨╗╤М╨╜╨╛ ╨╕╨╖ ╨║╨╛╤А╨╜╤П monorepo: `pnpm dev` (╨╛╨▒╨░), ╨╕╨╗╨╕ `pnpm dev:food` (:5173) + `pnpm dev:app` (:3000). Turbo **╨╜╨╡** ╨┐╨╛╨┤╨│╤А╤Г╨╢╨░╨╡╤В `.env` тАФ ╤Н╤В╨╛ ╨┤╨╡╨╗╨░╤О╤В Vite ╨╕ `tsx --env-file=.env`.
 
 `VITE_API_URL` ╨▓ `src/shared/api/client.ts` тАФ ╨╛╤В╨┤╨╡╨╗╤М╨╜╤Л╨╣ axios base (legacy). AI ╤Е╨╛╨┤╨╕╤В ╤З╨╡╤А╨╡╨╖ `fetch` ╨╜╨░ `VITE_AI_GATEWAY_URL`.
 
 ## ╨н╨╜╨┤╨┐╨╛╨╕╨╜╤В╤Л gateway
 
 | ╨Ь╨╡╤В╨╛╨┤ | ╨Я╤Г╤В╤М | Auth | ╨Ч╨░╨╝╨╡╤В╨║╨╕ |
 |-------|------|------|---------|
 | `GET` | `/health` | ╨╜╨╡╤В | `{ "status": "ok" }` |
-| `POST` | `/auth/telegram` | ╨╜╨╡╤В* | Telegram Login тЖТ JWT; ╨╛╤В╨▓╨╡╤В ╨▓╨║╨╗╤О╤З╨░╨╡╤В `hasActiveSubscription` |
+| `POST` | `/auth/telegram/start` | ╨╜╨╡╤В* | `{ challengeId, botDeepLink, expiresAt }` тАФ ╤Б╤В╨░╤А╤В bot deep-link login |
+| `GET` | `/auth/telegram/status?challengeId=` | ╨╜╨╡╤В* | `{ status: "pending" \| "expired" }` ╨╕╨╗╨╕ `{ status: "ok", token, user }` |
+| `POST` | `/telegram/webhook` | `X-Telegram-Bot-Api-Secret-Token` | Telegram Bot API updates; ╨┐╨╛╨┤╤В╨▓╨╡╤А╨╢╨┤╨╡╨╜╨╕╨╡ challenge |
 | `GET` | `/auth/me` | `X-User-Token` | ╨Я╤А╨╛╤Д╨╕╨╗╤М + `subscriptionExpiresAt` / `hasActiveSubscription` |
 | `GET` | `/usage` | device (+ optional JWT) | ╨Ъ╨▓╨╛╤В╨░: unlimited **╤В╨╛╨╗╤М╨║╨╛** ╨┐╤А╨╕ active ╨╗╨╕╤Ж╨╡╨╜╨╖╨╕╨╕ |
 | `POST` | `/billing/subscribe` | `X-User-Token` | T-Bank Init / mock |
 | `POST` | `/billing/tbank/notification` | Token T-Bank | ╨Р╨║╤В╨╕╨▓╨░╤Ж╨╕╤П ╨╗╨╕╤Ж╨╡╨╜╨╖╨╕╨╕ |
 | `GET` | `/billing/status` | `X-User-Token` | ╨б╤В╨░╤В╤Г╤Б ╨╗╨╕╤Ж╨╡╨╜╨╖╨╕╨╕ |
@@ -81,11 +88,11 @@ ai-app (openrouter-gateway)
 | `src/features/analyze-food/api/analyzeFoodApi.ts` | ╨Р╨╜╨░╨╗╨╕╨╖ ╤Д╨╛╤В╨╛/╤В╨╡╨║╤Б╤В╨░ тЖТ XML ╨Ъ╨С╨Ц╨г (stream) |
 | `src/features/analyze-food/api/streamChatCompletions.ts` | ╨Ю╨▒╤Й╨╕╨╣ SSE-╨║╨╗╨╕╨╡╨╜╤В `/v1/chat/completions` |
 | `src/features/analyze-food/api/refineMealApi.ts` | ╨г╤В╨╛╤З╨╜╨╡╨╜╨╕╨╡ ╤А╨╡╨╖╤Г╨╗╤М╤В╨░╤В╨░ |
 | `src/features/analyze-food/api/fetchMealCustomContentApi.ts` | ╨Ф╨╛╨┐. markdown-╨║╨╛╨╜╤В╨╡╨╜╤В ╨┐╨╛ ╨▒╨╗╤О╨┤╤Г |
 | `src/features/onboarding/api/micronutrientTargetsApi.ts` | ╨ж╨╡╨╗╨╕ ╨┐╨╛ ╨╝╨╕╨║╤А╨╛╨╜╤Г╤В╤А╨╕╨╡╨╜╤В╨░╨╝ |
-| `src/features/auth/*` | Telegram login, `/usage` |
+| `src/features/auth/*` | Bot deep-link login (`/auth/telegram/start` + poll), `/usage` |
 | `src/features/billing/*` | Subscribe / status / sync |
 
 ╨Ю╤И╨╕╨▒╨║╨╕ gateway (`RATE_LIMITED`, `UPSTREAM_TIMEOUT`, `QUOTA_EXCEEDED`, тАж) ╨╝╨░╨┐╤П╤В╤Б╤П ╨▓ ╨║╨╗╨╕╨╡╨╜╤В╤Б╨║╨╕╨╡ `ApiError`. ╨Я╤А╨╕ `402` UI ╨▓╨╡╨┤╤С╤В ╨│╨╛╤Б╤В╤П ╨╜╨░ `/login`, ╨░╨▓╤В╨╛╤А╨╕╨╖╨╛╨▓╨░╨╜╨╜╨╛╨│╨╛ тАФ ╨╜╨░ `/subscribe`.
 
 ## ╨б╤В╤А╤Г╨║╤В╤Г╤А╨░ ai-app (╨║╤А╨░╤В╨║╨╛)
diff --git a/docs/DOKPLOY.md b/docs/DOKPLOY.md
index 763282a..4e12e73 100644
--- a/docs/DOKPLOY.md
+++ b/docs/DOKPLOY.md
@@ -31,12 +31,14 @@ PORT=3000
 IS_LOCAL=false
 OPENROUTER_API_KEY=
 API_KEY=
 DATABASE_URL=
 AUTH_SECRET=
-FLASHCALL_API_KEY=
 TELEGRAM_BOT_TOKEN=
+TELEGRAM_BOT_USERNAME=
+TELEGRAM_WEBHOOK_SECRET=
+PUBLIC_GATEWAY_URL=https://<gateway-domain>
 FREE_GENERATION_LIMIT=50
 AUTH_LOGIN_GENERATION_BONUS=100
 PUBLIC_APP_URL=https://<frontend-domain>
 SUBSCRIPTION_PRICE_KOPECKS=10000
 SUBSCRIPTION_DURATION_DAYS=365
@@ -44,10 +46,13 @@ TBANK_TERMINAL_KEY=
 TBANK_PASSWORD=
 TBANK_API_URL=https://securepay.tinkoff.ru
 # TBANK_MOCK=true
 ```
 
+`PUBLIC_GATEWAY_URL` тАФ ╨┐╤Г╨▒╨╗╨╕╤З╨╜╤Л╨╣ origin gateway (╨┤╨╗╤П `setWebhook` тЖТ `/telegram/webhook`).  
+`PUBLIC_APP_URL` тАФ ╨┐╤Г╨▒╨╗╨╕╤З╨╜╤Л╨╣ URL **╤Д╤А╨╛╨╜╤В╨░** (Success/Fail/Notification T-Bank).
+
 `start:prod` = `prisma migrate deploy` + ╤Б╨╡╤А╨▓╨╡╤А. Postgres ╨┤╨╛╨╗╨╢╨╡╨╜ ╨▒╤Л╤В╤М ╨┤╨╛╤Б╤В╤Г╨┐╨╡╨╜ ╨║ ╨╝╨╛╨╝╨╡╨╜╤В╤Г ╤Б╤В╨░╤А╤В╨░ (Dokploy Postgres / ╨▓╨╜╨╡╤И╨╜╨╕╨╣ URL).
 
 ╨Ф╨╛╨╝╨╡╨╜ тЖТ ╨┐╨╛╤А╤В **3000**.
 
 ## 2. Frontend (`ai-food`)
@@ -82,10 +87,11 @@ VITE_AUTH_MOCK=false
 
 1. ╨Ч╨░╨┤╨╡╨┐╨╗╨╛╨╣ gateway, ╨┐╨╛╨╗╤Г╤З╨╕ URL.
 2. ╨Т env ╤Д╤А╨╛╨╜╤В╨░ ╤Г╨║╨░╨╢╨╕ `VITE_AI_GATEWAY_URL` ╨╜╨░ ╤Н╤В╨╛╤В URL (╨▒╨╡╨╖ `/v1`).
 3. `VITE_AI_GATEWAY_API_KEY` = `API_KEY` gateway.
 4. ╨Э╨░ gateway `PUBLIC_APP_URL` = ╨┐╤Г╨▒╨╗╨╕╤З╨╜╤Л╨╣ URL ╤Д╤А╨╛╨╜╤В╨░ (╤А╨╡╨┤╨╕╤А╨╡╨║╤В╤Л T-Bank).
+5. ╨Э╨░ gateway `PUBLIC_GATEWAY_URL` = ╨┐╤Г╨▒╨╗╨╕╤З╨╜╤Л╨╣ URL gateway (Telegram webhook). ╨Ч╨░╨┤╨░╨╣ `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET` тАФ ╨┐╤А╨╕ ╤Б╤В╨░╤А╤В╨╡ gateway ╨▓╤Л╨╖╨╛╨▓╨╡╤В `setWebhook`.
 
 ## Nixpacks (╨░╨╗╤М╤В╨╡╤А╨╜╨░╤В╨╕╨▓╨░)
 
 Build path: `/` (╨║╨╛╤А╨╡╨╜╤М).
 
