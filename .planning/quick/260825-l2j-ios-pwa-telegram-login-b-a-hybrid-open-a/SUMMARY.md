---
status: complete
slug: ios-pwa-telegram-login-b-a-hybrid-open-a
completed: 2026-08-25
---

# Summary: iOS PWA Telegram login B→A hybrid

## Done

- Added `prepareTelegramLoginPopup` + `openTelegramBotDeepLink` (blank-window gesture preserve, then navigate).
- `signInWithTelegramBot` accepts `popup`, `onDeepLinkReady`, `onNeedsManualOpen`; polls even when open is blocked.
- `TelegramBotLoginButton` opens blank sync on click; shows «Открыть Telegram» `<a>` while waiting (emphasized when blocked).

## Tests

`vitest`: `openTelegramBotDeepLink.test.ts` (6) + `signInWithTelegramBot.test.ts` (2) — all passed.

## Verify on device

1. iPhone Home Screen PWA → Войти → if Telegram does not open, tap «Открыть Telegram» → Start in bot → app should complete login.
2. Safari tab → same flow; auto-open should usually work without the extra tap.
