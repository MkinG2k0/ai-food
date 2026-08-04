# Task 4 Review: Thin Telegram Bot API client

**Reviewer:** code-reviewer subagent  
**Date:** 2026-08-04  
**Scope:** `8db7ba6..5a0bd1c` (2 files)  
**Brief:** `.superpowers/sdd/task-4-brief.md`  
**Report:** `.superpowers/sdd/task-4-report.md`

---

## Verdict

| Gate | Result |
|------|--------|
| **Spec** | ✅ |
| **Quality** | **Approved** |
| **Critical** | 0 |
| **Important** | 0 |
| **Minor** | 0 |

---

## Scope reviewed

- `apps/ai-app/src/lib/telegramBotApi.ts` — fetch-only Telegram Bot HTTP client
- `apps/ai-app/src/lib/telegramBotApi.test.ts` — deep-link + sendMessage tests
- Commit `5a0bd1c` — `feat(ai-app): add thin Telegram Bot API client`

Constraints applied: fetch-only Bot API client; no grammY; helpers per brief.

---

## Spec compliance

| Requirement | Status | Evidence |
|-------------|--------|----------|
| `getTelegramBotToken()` — `TELEGRAM_BOT_TOKEN` → `AUTH_TELEGRAM_BOT_TOKEN` | ✅ | `telegramBotApi.ts` L3–8; trim + null fallback |
| `getTelegramBotUsername()` — strip leading `@` | ✅ | L10–14 |
| `buildBotDeepLink(nonce)` → `https://t.me/<username>?start=<nonce>` | ✅ | L16–26; `encodeURIComponent(nonce)` |
| `telegramApi(method, body)` — POST to `api.telegram.org/bot<token>/<method>` | ✅ | L28–57; JSON body; error mapping |
| `sendMessage(chatId, text, replyMarkup?)` | ✅ | L59–69 |
| `answerCallbackQuery(id, text?)` | ✅ | L71–79 |
| `setWebhook({ url, secretToken })` with `message` + `callback_query` | ✅ | L81–90 |
| Misconfigured → `ApiError` 503 `TELEGRAM_MISCONFIGURED` | ✅ | L19–23, L34–38 |
| API failure → `ApiError` 502 `TELEGRAM_API_ERROR` | ✅ | L49–54 |
| Test: `buildBotDeepLink` strips `@` | ✅ | test L12–17 |
| Test: `sendMessage` POSTs to Bot API | ✅ | test L19–35 |
| No grammY / no webhook routes | ✅ | fetch only; 2 lib files in diff |
| Commit message per brief | ✅ | `feat(ai-app): add thin Telegram Bot API client` |
| Implementation matches brief Step 3 | ✅ | Byte-for-byte match with brief reference |

---

## Verification

```
pnpm exec vitest run src/lib/telegramBotApi.test.ts
✓ 2 passed (2)
```

Reviewer re-ran suite locally — all tests pass.

---

## Quality assessment

**HTTP client:** Uses native `fetch` with JSON POST, consistent with sibling `flashcall.ts`. Telegram envelope `{ ok, description }` handled; HTTP non-OK and `ok: false` both map to `ApiError`.

**Env handling:** Token/username trimmed; empty strings collapse to `null`; `@` prefix stripped once.

**Conventions:** `ApiError` import from `../../lib/errors.js` matches other `src/lib/*` modules. Tests use vitest dynamic import + `vi.stubGlobal('fetch')` + env cleanup in `afterEach` — same pattern as brief and sibling tests.

**Scope discipline:** Diff contains exactly the two brief files; no drive-by changes.

---

## Issues (confidence ≥ 80)

None.

---

## Informational (below review threshold)

- Brief interface doc lists `telegramApi<T>: Promise<T>`; Step 3 / implementation use `Promise<unknown>` and return the full Telegram envelope — consistent with reference code, no functional gap for Task 4 helpers (`void` return).
- No unit tests for `answerCallbackQuery`, `setWebhook`, or error paths — not required by brief; downstream tasks can extend coverage.
- `fetch` network failures propagate as raw errors (same as `flashcall.ts`); acceptable for thin client MVP.

---

## Summary

Task 4 fully satisfies the brief: all exports, env consumption, error codes, helpers, and tests implemented as specified. Fetch-only client with no grammY. **Approved** with no requested changes.
