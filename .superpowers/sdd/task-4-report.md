# Task 4 Report: Thin Telegram Bot API client

## Status
**Complete**

## Files
- `apps/ai-app/src/lib/telegramBotApi.ts` — thin HTTP client for Telegram Bot API
- `apps/ai-app/src/lib/telegramBotApi.test.ts` — Vitest unit tests

## Exports
| Function | Purpose |
|----------|---------|
| `getTelegramBotToken()` | Reads `TELEGRAM_BOT_TOKEN` or `AUTH_TELEGRAM_BOT_TOKEN` |
| `getTelegramBotUsername()` | Reads `TELEGRAM_BOT_USERNAME`, strips leading `@` |
| `buildBotDeepLink(nonce)` | Returns `https://t.me/<username>?start=<nonce>` |
| `telegramApi(method, body)` | Generic POST to `api.telegram.org/bot<token>/<method>` |
| `sendMessage(chatId, text, replyMarkup?)` | Bot API `sendMessage` |
| `answerCallbackQuery(id, text?)` | Bot API `answerCallbackQuery` |
| `setWebhook({ url, secretToken })` | Bot API `setWebhook` with `message` + `callback_query` updates |

## TDD
1. Wrote failing tests (module missing) — **FAIL** as expected
2. Implemented client per brief
3. Re-ran tests — **2/2 PASS**

## Commit
```
feat(ai-app): add thin Telegram Bot API client
```

## Notes
- Uses existing `ApiError` from `../../lib/errors.js` (503 misconfigured, 502 API error)
- No webhook routes added (Task 5+)
- Token fallback: `TELEGRAM_BOT_TOKEN` → `AUTH_TELEGRAM_BOT_TOKEN`
