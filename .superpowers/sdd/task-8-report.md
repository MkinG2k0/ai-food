# Task 8 Report: Env examples + docs

**Status:** ✅ Done  
**Commit:** `docs: Telegram bot auth env and gateway contract`

## Changes

| File | Update |
|------|--------|
| `apps/ai-app/.env.example` | Removed `FLASHCALL_API_KEY`; added `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET`, `PUBLIC_GATEWAY_URL` |
| `apps/ai-food/.env.example` | Bot deep-link flow documented; Login Widget/domain removed; `VITE_TELEGRAM_BOT_USERNAME` optional for button label |
| `docs/DOKPLOY.md` | Gateway env: Telegram vars + `PUBLIC_GATEWAY_URL`; Flash-Call removed; webhook setup step in «Связка» |
| `apps/ai-food/docs/AI-GATEWAY.md` | Endpoints `/auth/telegram/start`, `/auth/telegram/status`, `/telegram/webhook`; env table split; `PUBLIC_GATEWAY_URL` vs `PUBLIC_APP_URL` |

## Not committed

Real `.env` files unchanged. No secrets in diff.
