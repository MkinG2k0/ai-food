# Подписка (годовая лицензия)

**Последнее обновление:** 2026-08-04

Разовая покупка доступа к AI на **365 дней** через T-Bank эквайринг. Не рекуррентная подписка.

## Воронка

1. Гость: 50 бесплатных AI (`analyze` + `refine`) по `X-Device-Id` (`FREE_GENERATION_LIMIT`)
2. Лимит → `/login` (Telegram)
3. После входа: +100 к квоте устройства (`AUTH_LOGIN_GENERATION_BONUS`) → итого **150** (использованные гостевые генерации не сбрасываются)
4. Логин **сам по себе не даёт** unlimited
5. Без лицензии — device-квота с повышенным лимитом; после исчерпания → `/subscribe`
6. Оплата T-Bank → `hasActiveSubscription` → unlimited AI до `subscriptionExpiresAt`
7. После expiry — снова paywall

## Бесплатно всегда

Дневник, ручной ввод, штрихкод, статистика, онбординг, настройки, просмотр приёмов.

## Платно (после free-квоты)

AI analyze / AI refine — нужен `hasActiveSubscription` на gateway.

## Цена

| Env (ai-app) | Default |
|--------------|---------|
| `SUBSCRIPTION_PRICE_KOPECKS` | `199000` (= 1990.00 RUB) |
| `SUBSCRIPTION_DURATION_DAYS` | `365` |

## API (ai-app)

| Метод | Путь | Auth | Назначение |
|-------|------|------|------------|
| `POST` | `/billing/subscribe` | `X-User-Token` | Init платежа → `{ paymentUrl, paymentId }` |
| `POST` | `/billing/tbank/notification` | Token T-Bank | Активация при `CONFIRMED` |
| `GET` | `/billing/status` | `X-User-Token` | Статус лицензии + последний платёж |
| `POST` | `/billing/sync` | `X-User-Token` | GetState / mock confirm для pending |

## Mock (локально)

В `ai-app/.env`:

```
TBANK_MOCK=true
PUBLIC_APP_URL=http://localhost:5173
```

Без `TBANK_TERMINAL_KEY` / `TBANK_PASSWORD` реальный Init возвращает **503** `TBANK_MISCONFIGURED`. Mock Init отдаёт `paymentUrl` на `/subscribe/success?mock=1&paymentId=…`; фронт вызывает `POST /billing/sync` для активации.

## Frontend

- `/subscribe` — цена, состав, CTA «Оплатить»
- `/subscribe/success` — poll статуса
- `/subscribe/fail` — повтор
- Settings — soft block (статус / Купить / Продлить)
- `402 QUOTA_EXCEEDED`: гость → `/login`, auth → `/subscribe`

См. также [`AI-GATEWAY.md`](./AI-GATEWAY.md).
