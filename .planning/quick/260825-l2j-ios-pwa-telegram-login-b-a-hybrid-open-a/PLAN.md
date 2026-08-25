---
status: active
slug: ios-pwa-telegram-login-b-a-hybrid-open-a
---

# Quick: iOS PWA Telegram login B→A hybrid

## Goal

Telegram bot deep-link opens reliably from iOS Home Screen PWA (and Safari popup-blocked contexts).

## Approach

Hybrid **B→A**:

1. **B** — on click, sync `window.open('about:blank')`, after `/start` set `popup.location = botDeepLink`.
2. **A** — if popup blocked / fails, UI shows real `<a href={botDeepLink}>` «Открыть Telegram» while polling continues.

## Files

- `apps/ai-food/src/features/auth/api/openTelegramBotDeepLink.ts` (+ test)
- `apps/ai-food/src/features/auth/api/signInWithTelegramBot.ts` (+ test)
- `apps/ai-food/src/features/auth/ui/TelegramBotLoginButton.tsx`
- `apps/ai-food/src/features/auth/index.ts` if needed

## Done when

- Auto-open uses pre-opened blank window (gesture preserved).
- Blocked case surfaces manual Open Telegram link; poll still runs.
- Unit tests cover opened vs blocked paths.
