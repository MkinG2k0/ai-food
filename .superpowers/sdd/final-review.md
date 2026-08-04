# Final whole-branch review: Admin Web + Gateway Admin API

**Диапазон:** `aa1283429e9f1b178812c73a75b4b447d8eb48cd..6428e7760a7f7567588fe3dd2f4eda28a77034ac`  
**Основание:** design spec, implementation plan, предоставленный Task 9 E2E PASS report и полный branch diff.

## Strengths

- Архитектурная граница выдержана: браузер работает только с Next.js BFF, а `ADMIN_API_KEY` используется исключительно серверным `gatewayAdmin`.
- Защита реализована в обоих слоях: middleware закрывает `/admin/*`, BFF самостоятельно проверяет JWT-сессию, gateway fail-closed проверяет `X-Admin-Key` через timing-safe comparison.
- Runtime pricing последовательно протянута через Prisma `AppSettings`, публичный price endpoint, promo/subscribe и активацию лицензии; DB/env/default fallback соответствует плану.
- Admin API аккуратно валидирует pricing и subscription actions, возвращает существующий error envelope и корректно реализует activate/extend/revoke.
- Статистика использует параллельные агрегаты и правильный критерий активной подписки (`active` и будущий `expiresAt`).
- UI покрывает весь MVP scope, не раскрывает секрет gateway и корректно переводит рубли в копейки.
- Миграция, targeted suite (35 тестов), type-check и полный E2E-сценарий, включая изменение цены без рестарта и lifecycle подписки, отмечены как успешно пройденные.

## Critical

Нет.

## Important

Нет.

Исправлений уровня Critical/Important перед merge не требуется.

## Minor

### 1. Login endpoint раскрывает состояние серверной конфигурации

**Файл:** `apps/ai-web/src/app/api/admin/login/route.ts:15-22`

При незаданном `ADMIN_PASSWORD` неаутентифицированный клиент получает
отдельный `500` с текстом `ADMIN_PASSWORD is not configured`, тогда как
спецификация требует не раскрывать наличие конфигурации через login flow.
Возвращать наружу нейтральную ошибку входа/сервера, а точную причину оставлять
в server-side логах.

### 2. Публичный password endpoint не имеет защиты от частых попыток

**Файл:** `apps/ai-web/src/app/api/admin/login/route.ts:15-60`

На `/api/admin/login` нет rate limit или backoff. С рекомендованным случайным
24-byte паролем практический риск подбора низок, поэтому это не блокирует
merge, но для интернет-доступной админки желательно ограничить попытки на
reverse proxy или в приложении.

### 3. Тесты не закрепляют часть важных аргументов интеграции

**Файлы:** `apps/ai-app/src/routes/billing.test.ts`,
`apps/ai-app/src/routes/admin.test.ts`,
`apps/ai-app/src/middleware/adminAuth.test.ts`

- Billing tests проверяют результат async pricing helpers, но не подтверждают,
  что им передан текущий Prisma client.
- Stats test проверяет response shape/values, но почти не проверяет `where`
  для active subscription, confirmed payments и 7/30-day usage windows.
- Fail-closed тест покрывает отсутствующий ключ, но отдельно не закрепляет
  поведение для `ADMIN_API_KEY=''`/whitespace.

Текущая реализация во всех трёх местах корректна; замечание относится к
регрессионной устойчивости тестов.

### 4. Session cookie name продублировано

**Файлы:** `apps/ai-web/src/middleware.ts`,
`apps/ai-web/src/lib/gatewayAdmin.ts`,
`apps/ai-web/src/app/api/admin/login/route.ts`,
`apps/ai-web/src/app/api/admin/logout/route.ts`

`admin_session` задан четырьмя локальными константами. Расхождение при будущем
переименовании может отдельно сломать login, middleware, BFF или logout.
Следует вынести имя cookie в edge-compatible общий модуль и унифицировать
импорты session helpers через тот же публичный путь.

## Verdict

**Approve with nits.**

Реализация соответствует утверждённым spec/plan, заявленный E2E-контракт
выполнен, блокирующих дефектов в branch diff не найдено.
