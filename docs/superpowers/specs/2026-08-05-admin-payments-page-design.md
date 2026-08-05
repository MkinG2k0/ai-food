# Admin Payments Page (list + delete)

**Date:** 2026-08-05  
**Status:** Approved  
**Repos:** `apps/ai-web` (admin UI) + `apps/ai-app` (gateway admin API)  
**Approach:** New `/admin/payments` page mirroring Subscriptions patterns; `GET`/`DELETE` on gateway `/admin/payments`

## Goal

Дать админу страницу со списком платежей и возможностью удалять демо/тестовые записи. При удалении **подтверждённого** платежа подписка пользователя отзывается; для остальных статусов удаляется только запись платежа.

## Non-goals

- Фильтры, поиск, пагинация UI (список с лимитом на API)
- Bulk-delete
- Refund через T-Bank / смена статуса платежа без удаления
- Создание платежей из админки
- Soft-delete / аудит-лог удалений

## Decisions

| Вопрос | Решение |
|--------|---------|
| Где UI | Отдельная страница `/admin/payments` + пункт меню «Платежи» |
| Удаление confirmed | Hard-delete платежа + revoke подписки (`none`, `expiresAt: null`) |
| Удаление pending / rejected / refunded | Только hard-delete записи платежа |
| Подтверждение в UI | Popconfirm; текст зависит от статуса |
| Паттерн | Как «Подписки»: Ant Design Table, TanStack Query, BFF proxy |

## Architecture

```mermaid
sequenceDiagram
  participant Browser
  participant Web as ai-web
  participant GW as ai-app /admin
  participant DB as Postgres

  Browser->>Web: GET /admin/payments
  Web->>GW: GET /admin/payments (X-Admin-Key)
  GW->>DB: Payment.findMany + user
  GW-->>Web: { payments: [...] }
  Web-->>Browser: table

  Browser->>Web: DELETE payment
  Web->>GW: DELETE /admin/payments/:id
  GW->>DB: tx: delete Payment; if confirmed revoke User sub
  GW-->>Web: { ok: true } / payment snapshot
  Web-->>Browser: refresh list
```

### Gateway (`apps/ai-app`)

- `GET /admin/payments` (behind `requireAdminKey`)
  - `findMany` payments, `orderBy: createdAt desc`, `take: 50`
  - `include` user fields needed for display (`id`, `telegramId`, `username`, `firstName`, `lastName`)
  - Response shape:
    ```json
    {
      "payments": [
        {
          "id": "...",
          "amount": 90000,
          "status": "confirmed",
          "paidAt": "ISO|null",
          "createdAt": "ISO",
          "tbankPaymentId": "...|null",
          "tbankOrderId": "...",
          "user": {
            "id": "...",
            "telegramId": "...",
            "username": "...|null",
            "firstName": "...|null",
            "lastName": "...|null"
          }
        }
      ]
    }
    ```
- `DELETE /admin/payments/:id`
  - 404 if not found
  - In a transaction:
    1. Load payment
    2. `delete` payment
    3. If `status === 'confirmed'`: update user `subscriptionStatus: 'none'`, `subscriptionExpiresAt: null`
  - Response: `{ ok: true, revokedSubscription: boolean }`
  - 503 if DB unavailable (same as other admin routes)

### BFF (`apps/ai-web`)

- `src/app/api/admin/gateway/payments/route.ts` → proxy GET
- `src/app/api/admin/gateway/payments/[id]/route.ts` → proxy DELETE  
  (same cookie-session + `ADMIN_API_KEY` pattern as existing gateway routes)

### UI (`apps/ai-web`)

- Menu: add «Платежи» (e.g. `WalletOutlined` / `DollarOutlined`) between «Цены» и «Подписки»; title map entry
- Page `src/app/admin/payments/page.tsx`:
  - `PageHeader` title «Платежи», subtitle про список и удаление демо
  - Columns: createdAt, amount (₽ from kopecks), status Tag (`pending` / `confirmed` / `rejected` / `refunded`), user (`@username` or telegramId), paidAt, Delete action
  - Popconfirm:
    - confirmed: «Удалить платёж и отозвать подписку?»
    - иначе (pending / rejected / refunded): «Удалить платёж?»
  - On success: toast, invalidate `['admin','payments']` and `['admin','stats']` (и при желании users)

## Error handling

| Case | Behavior |
|------|----------|
| Load failure | Alert on page (as Overview/Subscriptions) |
| Delete failure | toast error |
| Unknown id | 404 from gateway → toast |
| No DB | 503 |
| No admin key | 401 (existing middleware) |

## Tests (`apps/ai-app`)

Extend `admin.test.ts` (or sibling):

1. `GET /admin/payments` returns list shape (with admin key)
2. `DELETE` confirmed payment → payment gone + user subscription revoked
3. `DELETE` pending payment → payment gone + subscription unchanged
4. `DELETE` missing id → 404
5. Without admin key → 401

## Out of scope (explicit)

- T-Bank cancel/refund API
- Cascading only when «this payment activated the sub» (always revoke on any confirmed delete)
- Soft delete
