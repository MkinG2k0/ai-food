# Quick Task 260804-3gx: Годовая подписка T-Bank + paywall - Context

**Gathered:** 2026-08-04
**Status:** Ready for planning

<domain>
## Task Boundary

Годовая лицензия (one-time оплата, без рекуррента) через T-Bank эквайринг ([Init API](https://developer.tbank.ru/eacq/api/init)): привязка к авторизованному пользователю в `ai-app`, затем paywall в `ai-food`. Заменить текущее «login = unlimited until subscription» на реальную годовую лицензию.

</domain>

<decisions>
## Implementation Decisions

### Модель продукта (paywall)
- **Не подписка с автосписанием** — разовая покупка «доступ на 365 дней» (лицензия ПО).
- **Цена MVP:** `1990.00 RUB` (= `199000` копеек), конфиг `SUBSCRIPTION_PRICE_KOPECKS` / `SUBSCRIPTION_DURATION_DAYS=365`.
- **Воронка:**
  1. Гость: 50 бесплатных AI (`analyze`+`refine`) — уже есть.
  2. Лимит → логин Telegram (уже есть).
  3. Логин **сам по себе больше не даёт unlimited**.
  4. Без активной лицензии AI идёт через ту же guest-квоту устройства; после исчерпания → hard paywall.
  5. Оплата T-Bank → `subscriptionStatus=active` + `subscriptionExpiresAt=now+365d` → unlimited AI до expiry.
  6. После expiry → `none` (или `expired` если добавим enum) → снова paywall; повторная разовая покупка.
- **Бесплатно навсегда (без лицензии):** дневник, ручной ввод, штрихкод, статистика, онбординг, настройки, просмотр приёмов.
- **Платно (нужна active лицензия после free-квоты):** AI analyze / AI refine.

### T-Bank интеграция (backend `ai-app`)
- Метод `POST https://securepay.tinkoff.ru/v2/Init` (тест: sandbox URL из ЛК).
- `PayType=O` (одностадийная), **не** передавать `Recurrent=Y`.
- `CustomerKey` = internal `user.id` (не telegramId) для привязки покупателя без рекуррента.
- `OrderId` = уникальный id заказа в нашей БД (`Payment.id` / cuid).
- `NotificationURL` → `POST /billing/tbank/notification` (проверка Token по Password терминала).
- `SuccessURL` / `FailURL` → фронт `/subscribe/success` и `/subscribe/fail` (или query на `/subscribe`).
- Активация лицензии **только** по уведомлению со статусом успешной оплаты (`CONFIRMED` / `AUTHORIZED` в зависимости от одностадийности — сверить с докой терминала; для `PayType=O` обычно `CONFIRMED`).
- Идемпотентность: повторный callback с тем же `PaymentId` не продлевает второй раз.
- Env: `TBANK_TERMINAL_KEY`, `TBANK_PASSWORD`, `TBANK_API_URL`, `PUBLIC_APP_URL`, `SUBSCRIPTION_PRICE_KOPECKS`.
- Без ключей терминала: endpoint Init возвращает понятную `503` / mock-режим только если `TBANK_MOCK=true` (dev).

### Данные
- Расширить `User`: `subscriptionExpiresAt DateTime?` (status `active` валиден только если `expiresAt > now`).
- Модель `Payment`: `id`, `userId`, `amount`, `status` (`pending|confirmed|rejected|refunded`), `tbankPaymentId?`, `tbankOrderId`, `paidAt?`, timestamps.
- `GET /auth/me` и ответ login уже отдают `subscriptionStatus` — добавить `subscriptionExpiresAt`, `hasActiveSubscription: boolean`.
- API:
  - `POST /billing/subscribe` (JWT) → Init → `{ paymentUrl, paymentId }`
  - `POST /billing/tbank/notification` (public, token-verify) → activate
  - `GET /billing/status` (JWT) → status snapshot
  - Опционально `POST /billing/sync` (JWT) → GetState по pending payment (если notification потерялся)

### Квота (`ai-app` middleware)
- **Было:** authenticated → skip guest quota (unlimited).
- **Стало:** unlimited **только** если `hasActiveSubscription(user)`.
- Auth без лицензии → те же guest-правила по `X-Device-Id`.
- Коды ошибок:
  - `402 QUOTA_EXCEEDED` — гость/без лицензии, квота кончилась (клиент: login или `/subscribe` в зависимости от auth).
  - При auth + quota exceeded → клиент ведёт на `/subscribe` (не только login).

### Frontend paywall (`ai-food`)
- Страница `/subscribe`: цена, что входит, CTA «Оплатить» → открыть `paymentUrl` (web: `window.location` / Capacitor Browser).
- Soft: блок в Settings (статус лицензии / дата окончания / «Продлить» / «Купить»).
- Hard: при `402` если есть session → `/subscribe`; если нет → `/login`.
- После success URL: poll `/billing/status` или refresh `/auth/me` до `hasActiveSubscription`.
- UI на русском, в стиле существующего приложения (не отдельный лендинг-бренд).

### Порядок работ
1. Backend `ai-app` (schema, billing routes, quota change, tests).
2. Frontend `ai-food` (API client, `/subscribe`, Settings, 402 routing).
3. Docs: обновить `docs/AI-GATEWAY.md` / sibling notes + short `docs/SUBSCRIPTION.md`.

### Claude's Discretion
- Цена 1990 ₽/год — placeholder, легко меняется env.
- Enum: оставить `SubscriptionStatus` как есть; expiry через `subscriptionExpiresAt`; при проверке если `active` но expired → считать inactive (и опционально lazy-update status).
- Чеки 54-ФЗ / Receipt в Init — **отложить** (не блокер MVP; можно добавить `Receipt` позже).
- Возвраты / Cancel — вне MVP (только статус `refunded` в модели на будущее).

</decisions>

<specifics>
## Specific Ideas

- Пользователь явно: T-Bank эквайринг, год, один платёж, без рекуррента, покупка после авторизации, привязка к user, backend first then frontend, paywall придумать самим.
- Уже есть: Prisma `subscriptionStatus`, Telegram JWT auth, guest quota 50, design doc отложил payment.

</specifics>

<canonical_refs>
## Canonical References

- https://developer.tbank.ru/eacq/api — T-Bank Acquiring API
- https://developer.tbank.ru/eacq/api/init — `POST /v2/Init`
- `d:\Project\Main\ai-app\docs\superpowers\specs\2026-08-04-optional-auth-quota-design.md` — текущая квота; non-goal Payment снимается этим quick task
- `d:\Project\Main\ai-app\prisma\schema.prisma` — User.subscriptionStatus
- `d:\Project\Main\ai-food\docs\AI-GATEWAY.md` — контракт gateway

</canonical_refs>
