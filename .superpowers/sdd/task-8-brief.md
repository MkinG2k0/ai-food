### Task 8: Env examples + docs

**Files:**
- Modify: `apps/ai-app/.env.example`
- Modify: `apps/ai-food/.env.example`
- Modify: `docs/DOKPLOY.md`
- Modify: `apps/ai-food/docs/AI-GATEWAY.md`
- Modify local `.env` files only if needed for smoke (do **not** commit secrets)

- [ ] **Step 1: Update `apps/ai-app/.env.example`**

Remove `FLASHCALL_API_KEY`. Add:

```env
TELEGRAM_BOT_TOKEN=
# alias also accepted: AUTH_TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=
TELEGRAM_WEBHOOK_SECRET=
PUBLIC_GATEWAY_URL=http://127.0.0.1:3000
```

- [ ] **Step 2: Update `apps/ai-food/.env.example`**

Document bot deep-link flow (not Login Widget domain). Keep optional `VITE_TELEGRAM_BOT_USERNAME` for copy only.

- [ ] **Step 3: Update `DOKPLOY.md` + `AI-GATEWAY.md`**

- Endpoints: `/auth/telegram/start`, `/auth/telegram/status`, `/telegram/webhook`
- Env table: Telegram vars; remove Flash-Call
- Note: `PUBLIC_GATEWAY_URL` = gateway public origin for webhook; `PUBLIC_APP_URL` remains frontend for T-Bank

- [ ] **Step 4: Commit**

```bash
git add apps/ai-app/.env.example apps/ai-food/.env.example docs/DOKPLOY.md apps/ai-food/docs/AI-GATEWAY.md
git commit -m "docs: Telegram bot auth env and gateway contract"
```

---

## Spec coverage checklist

| Spec item | Task |
|-----------|------|
| Bot in ai-app, not separate app | 4–6 |
| start → deep link → poll | 5, 7 |
| webhook confirm + JWT on challenge | 6 |
| User.telegramId + wipe migration | 2 |
| JWT telegramId | 1 |
| Remove Flash-Call | 5–6 |
| Status 200 pending/expired/ok | 5 |
| Consume once | 3, 5 |
| Webhook secret header | 6 |
| setWebhook on boot | 6 |
| Frontend replace widget | 7 |
| Docs / env | 8 |
| Non-goals (Mini App, bot product, etc.) | not scheduled |

## Plan self-review

- No TBD placeholders left; callback_data locked to `ok:<challengeId>`.
- Types consistent: `telegramId` string everywhere after Task 1–2.
- Expiry test uses `ttlMs: -1` to avoid flaky spin.

---

**Plan complete and saved to** `apps/ai-app/docs/superpowers/plans/2026-08-04-telegram-bot-auth.md`.

**Два варианта исполнения:**

1. **Subagent-Driven (рекомендую)** — свежий субагент на задачу, ревью между задачами  
2. **Inline Execution** — выполнять задачи в этой сессии с чекпоинтами  

Какой подход?
