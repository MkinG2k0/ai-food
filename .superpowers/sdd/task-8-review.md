# Task 8 review

**Scope:** `81271ed` → `5dd6acb` — env examples + docs (Telegram bot auth)  
**Commit:** `docs: Telegram bot auth env and gateway contract`

## Spec

- ✅ `apps/ai-app/.env.example`: `FLASHCALL_API_KEY` удалён; добавлены `TELEGRAM_BOT_TOKEN`, alias `AUTH_TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET`, `PUBLIC_GATEWAY_URL` (с пояснением webhook vs frontend).
- ✅ `apps/ai-food/.env.example`: описан bot deep-link flow (`/auth/telegram/start` → `botDeepLink` → poll `/auth/telegram/status`); Login Widget / domain убраны; `VITE_TELEGRAM_BOT_USERNAME` опционален и закомментирован.
- ✅ `docs/DOKPLOY.md`: Flash-Call убран из gateway env; добавлены Telegram vars + `PUBLIC_GATEWAY_URL`; шаг 5 в «Связка» про webhook/`setWebhook`; разделение `PUBLIC_GATEWAY_URL` vs `PUBLIC_APP_URL`.
- ✅ `apps/ai-food/docs/AI-GATEWAY.md`: эндпоинты `/auth/telegram/start`, `/auth/telegram/status`, `/telegram/webhook`; env-таблица с Telegram vars; старый `POST /auth/telegram` (Login Widget) заменён; клиентский модуль auth обновлён.
- ✅ Секреты не закоммичены; реальные `.env` вне diff.

## Verification

- Diff: 4 файла, +34 / −14 — совпадает с review-pkg.
- Сверка с кодом (`auth.ts`, `app.ts`, `telegramWebhook.ts`, `telegramWebhookSetup.ts`, `telegramBotApi.ts`): пути, заголовок `X-Telegram-Bot-Api-Secret-Token`, env-имена и alias совпадают с документацией.
- `grep FLASHCALL` в `docs/` и `apps/*/docs/` — совпадений нет.

## Verdict

**Approved.** Изменения полностью закрывают Task 8; блокирующих замечаний (confidence ≥ 80) нет.
