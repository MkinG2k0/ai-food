# Task 5 Report: Spec status + gateway doc touch-up

**Status:** Done

## Commits

- `eb422bf` — docs: document promo validate endpoint and mark promo spec implemented

## Summary

- `2026-08-04-promo-codes-design.md`: Status → `Approved — implemented`
- `AI-GATEWAY.md`: добавлена строка `POST /billing/promo/validate`; у `/billing/subscribe` указаны опциональный `promoCode` и поля ответа `amount` / `originalAmount` / `promoCode`

## Concerns

- Нет. Документация соответствует реализованным эндпоинтам в `billing.ts` и клиенту `billingApi.ts`.

## Report path

`.superpowers/sdd/promo-task-5-report.md`
