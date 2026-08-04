# Итоговый review: Telegram bot auth

**Объём:** весь diff от `2f93d8166ef39b60b227a481740183989343ca1a` до `5dd6acb5cd67a13aec83a231c36e3779bed36470`, включая gateway, Prisma-миграцию, frontend login и документацию.

## Вердикт

**Нужны исправления перед merge.**

| Категория | Количество |
| --- | ---: |
| Critical | 0 |
| Important | 1 |
| Minor | 0 |

## Important

### Не проверяется готовность БД и JWT до создания challenge

**Уверенность: 95/100**  
**Файл:** `apps/ai-app/src/routes/auth.ts:75-94`  
**Контракт:** спецификация, раздел «Errors», требует `503 DATABASE_UNAVAILABLE` при недоступной БД.

`POST /auth/telegram/start` проверяет только `TELEGRAM_BOT_TOKEN` и
`TELEGRAM_BOT_USERNAME`. Поэтому при отсутствующей/недоступной БД он всё
равно создаёт challenge и возвращает deep link. Пользователь проходит в
Telegram, но webhook не может выполнить `upsert` и отвечает callback-ом
«Ошибка сервера»; фронтенд остаётся в polling до истечения пяти минут.

Аналогично, отсутствие или слишком короткий `AUTH_SECRET` обнаруживается
лишь после успешного `upsert` в webhook, при `signUserToken`. В результате
пользователь совершает действие в Telegram, но не получает сессию, а запись
пользователя уже могла быть создана.

Проверять готовность зависимостей в `/auth/telegram/start`: вызвать
`requireDb()` (и при необходимости лёгкий DB health/read-запрос), а также
провалидировать `AUTH_SECRET` до `createLoginChallenge`. Так ошибка будет
получена синхронно на login-экране и не появится неиспользуемый challenge.

## Проверки

- `pnpm --dir apps/ai-app test` — 15 файлов, 78 тестов пройдены.
- `pnpm --dir apps/ai-app type-check` — пройден.
- `pnpm --dir apps/ai-food test` — 55 файлов, 401 тест пройден.
- `pnpm --dir apps/ai-food type-check` — пройден.
- IDE-диагностика изменённых auth-файлов — без ошибок.

Остальной реализованный поток соответствует одобренной архитектуре:
одноразовый challenge, webhook secret, подтверждение через Telegram, polling
статуса и перенос identity на `telegramId` реализованы согласованно.
