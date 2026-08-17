# Server-side user data persistence

**Последнее обновление:** 2026-08-13

## Статус (кратко)

После **входа** (`X-User-Token`) данные аккаунта **синхронизируются** между устройствами через gateway (`apps/ai-app` + Postgres).

| Синхронизируется | Не синхронизируется |
|------------------|---------------------|
| Профиль питания `{ profile, targets, micronutrientTargets? }` | **Фото приёмов** (blobs) — только Capacitor Filesystem на устройстве; в sync уходят лишь URI-stubs |
| Дневник `meals[]` | Гостевой режим без логина (только Preferences на устройстве) |
| Избранное | `selectedDate`, model-test, deviceId generation |
| Вес + `goalKg` | |
| Настройки UI / `customInstructions` / `aiModel` / feature flags / `calendarRings` | |
| Серия (заморозки, рекорд, celebration) | |
| Auth / квоты / подписка | |

**Главное для продукта:** после входа восстанавливаются профиль (вкл. микро), дневник, избранное, вес, настройки. **Фото еды намеренно никогда не хранятся на сервере** — только локальный Filesystem + URI stubs в sync.

Детали триггеров и API — ниже. Sync **не** гейтится подпиской ([SUBSCRIPTION.md](./SUBSCRIPTION.md)).

**Monorepo:** контракт в `apps/ai-food/docs`; реализация — `apps/ai-app` (Prisma + Express) + клиентские hooks в `apps/ai-food`.

Auth-паттерн: `X-User-Token` (как `PUT /auth/profile`).

---

## Sync triggers (P0 diary — locked)


| Trigger | Behavior |
|---------|----------|
| **Leave meal UI** | Upsert текущего meal при уходе с `/meal/:id` или `/meal/:mealId/item/:itemId` — **не** на каждый keystroke/field edit |
| **Add meal** | Immediate upsert после `addMeal` (scan / manual / barcode / favorite quick-add); после завершения AI analyze/error на Home — ещё один upsert (финальный статус без захода в meal UI) |
| **Confirm delete** | Immediate soft-delete sync после подтверждения удаления |
| **Login / auth hydrate** | Full sync после успешного login и один раз при hydrate, если есть `X-User-Token` |
| **Guests** | Только Preferences / `ai-food-diary` — **нет** вызовов `/user/meals/sync` без токена |

Дополнительно (контракт):

- LWW по `clientUpdatedAt` на уровне целого meal
- Soft-delete tombstones (`deletedAt` + тот же clock)
- Sync **не** требует подписки
- Photo blobs **не** загружаются (только URI stubs) — **фото не синкаются**
- Settings / `micronutrientTargets` — **Done** (P2)

---

## Sync triggers (P1 weight + favorites — locked)

| Trigger | Behavior |
|---------|----------|
| **Weight add/update / goalKg** | Immediate full `POST /user/weights/sync` when token present |
| **Favorite add/remove** | Immediate upsert/delete `POST /user/favorites/sync` |
| **Login / auth hydrate** | Full weight + favorites sync alongside diary |
| **Guests** | Local Preferences only — no weight/favorites API |

Endpoints: `POST /user/weights/sync` (body includes `goalKg`), `POST /user/favorites/sync`. LWW `clientUpdatedAt`, soft-delete, image stubs, no subscription gate.

---

## Sync triggers (P2 settings + micronutrientTargets — locked)

| Trigger | Behavior |
|---------|----------|
| **Settings change** | Debounced (~400ms) `POST /user/settings/sync` + flush on leave Settings |
| **Login / auth hydrate** | `syncSettings` в `queueFullUserDataSync` |
| **Profile / targets / micronutrientTargets** | `PUT /auth/profile` с `{ profile, targets, micronutrientTargets? }` |
| **Guests** | Local only |

Endpoint settings: `POST /user/settings/sync` — single-doc LWW на `User.clientSettings` + `settingsClientUpdatedAt`.

---

## Sync triggers (P3 streak — locked)

| Trigger | Behavior |
|---------|----------|
| **Streak persist change** | Immediate `POST /user/streak/sync` when `freezeCount`, consumed freezes, milestone grants, `bestStreak`, or `lastCelebratedLocalDate` change (after local reconcile or celebration) |
| **Login / auth hydrate** | `syncStreak` в `queueFullUserDataSync` |
| **Guests** | Local `ai-food-streak` only |

Endpoint: `POST /user/streak/sync` — single-doc LWW на `User.clientStreak` + `streakClientUpdatedAt`. Payload: **`currentLength`** (активная серия для друзей), `freezeCount`, `consumedFreezeDateKeys`, `grantedMilestones`, `lastCelebratedLocalDate`, `bestStreak`. Перед push клиент пересчитывает `currentLength` из дневника; full sync streak идёт **после** diary sync.

---

## 1. Inventory (as-of audit 2026-08-13)

### Client-only (Capacitor Preferences / Zustand persist / Filesystem)

| Store / key | Данные |
|-------------|--------|
| `ai-food-diary` | `meals[]` — КБЖУ, items, portions, grams, imageUri(s), micronutrients, healthiness, status, timestamps; + `pendingDeletes` для tombstone clocks |
| `ai-food-favorites` | `favorites[]` + `pendingDeletes` (max 50; image URI stubs) |
| `ai-food-weight` | weight `entries[]` + `goalKg` (+ `clientUpdatedAt` on entries) |
| `ai-food-settings` | `customInstructions`, feature flags, `aiModel`, `calendarRings` |
| `ai-food-streak` | `currentLength`, `freezeCount`, consumed freezes, milestone grants, `bestStreak`, `lastCelebratedLocalDate`, `clientUpdatedAt` |
| `ai-food-profile` | `profile`, `targets` (DailyTargets), **`micronutrientTargets`** — часть синкается (см. ниже) |
| `ai-food-auth` | session token локально (на сервере — `User`) |
| `ai-food-model-test` | UI state model-test (dev) |
| `deviceId` | заголовок `X-Device-Id` |
| meal images | Capacitor Filesystem (локальные URI) |
| `ai-food-usage` | localStorage snapshot квоты |

### Already on server (Postgres / Prisma `apps/ai-app`)

| Model | Релевантные поля |
|-------|------------------|
| `User` | `telegramId`, names, `photoUrl`, consent, **`nutritionProfile` Json** (profile+targets+micronutrientTargets?), **`clientSettings` Json**, **`settingsClientUpdatedAt`**, **`clientStreak` Json**, **`streakClientUpdatedAt`**, **`goalKg`**, subscription* |
| `Meal` | client-cuid id, items Json, KBJU fields, `clientUpdatedAt`, soft-delete `deletedAt` |
| `WeightEntry` | id, date (YYYY-MM-DD), kg, `clientUpdatedAt`, soft-delete |
| `Favorite` | id, sourceMealId, name, items Json, macros, image stubs, `clientUpdatedAt`, soft-delete |
| `Device` | `deviceId`, optional `userId` |
| `UsageEvent` | kind + device/user |
| `Payment` / `PromoCode` / `AppSettings` | billing |
| `GatewayRequest` | observability |

**Нет** blob-хранилища фото приёмов — **намеренно навсегда** (только URI stubs).

### Already synced

| Данные | Как |
|--------|-----|
| Auth → `User` | Telegram / demo login → JWT |
| Nutrition profile | `PUT /auth/profile` + `GET /auth/me` — `{ profile, targets, micronutrientTargets? }` |
| Diary meals (P0) | `POST /user/meals/sync`; LWW + soft-delete |
| Weight + goalKg (P1) | `POST /user/weights/sync` |
| Favorites (P1) | `POST /user/favorites/sync` |
| Settings (P2) | `POST /user/settings/sync` |
| Streak persist (P3) | `POST /user/streak/sync` |
| Usage / quota + billing | `/usage`, `/billing/*` |
| Guest → user device linking | при логине |

---

## 2. Gaps (prioritized)

| Priority | Gap | Почему |
|----------|-----|--------|
| **P0** | Diary `meals[]` | **Done** |
| **P1** | Weight history + favorites | **Done** |
| **P2** | Settings + `micronutrientTargets` | **Done** |
| — | Meal photo blobs | **Won't do** — устройство only; URI stubs forever |

Sync diary/manual/barcode/stats/settings **не** должен требовать `hasActiveSubscription`.

---

## 3. P0 diary sync

### Prisma `Meal`

| Prisma field | Client `Meal` / notes |
|--------------|------------------------|
| `id` String @id | client `Meal.id` (cuid) — client-generated, server accepts |
| `userId` String | FK → `User`; **всегда** из JWT, не из body |
| `timestamp` DateTime | `Meal.timestamp` |
| `name` String? | `Meal.name` |
| `items` Json | `FoodItem[]` |
| `totalCalories` Int / Float | `totalCalories` |
| `portions` Float? | `portions` |
| `totalGrams` Float? | `totalGrams` |
| `status` String? | `analyzing` \| `ready` \| `error` |
| `healthiness` Float? | |
| `confidence` Float? | |
| `analyzeErrorCode` String? | |
| `micronutrients` Json? | `MicronutrientEstimate[]` |
| `aiModel` String? | model id used for scan |
| `portionReference` String? | |
| `addedSugar` Float? | |
| `confidenceReason` / `healthinessReason` String? | |
| `disclaimers` Json? | `string[]` |
| `customContent` String? | |
| `customContentEntries` Json? | |
| `imageUri` / `imageUris` String? / Json? | **stubs only** — local path или null; **blob upload не планируется** |
| `clientUpdatedAt` DateTime | для LWW |
| `deletedAt` DateTime? | soft-delete |
| `createdAt` / `updatedAt` | server timestamps |

`@@index([userId, timestamp])`, `@@index([userId, clientUpdatedAt])`.

### API (gateway, `X-User-Token`)

**Bulk sync** `POST /user/meals/sync`

| | |
|---|---|
| Auth | `X-User-Token` (обязателен; **нет** anonymous diary sync) |
| Body | `{ since?: ISO, upserts: MealPayload[], deletes: { id, clientUpdatedAt }[] }` |
| Response | `{ meals: MealPayload[], tombstones?: id[] }` — серверный snapshot / delta после merge |
| Ownership | все writes scoped к `userId` из токена; reject чужие id |

**Почему bulk, не чистый CRUD:** дневник offline-first (Capacitor Preferences); после login на втором устройстве нужен один round-trip «забрать всё / отдать локальные изменения». LWW естественно ложится на batch с `clientUpdatedAt`.

Опционально позже: `GET/PUT/DELETE /user/meals/:id` для точечных UI-операций — не блокер P0.

Images: передавать `imageUri`/`imageUris` как optional string/null stubs (на другом девайсе локальные пути бесполезны). **Загрузка blob-фото на сервер не делается и не планируется.**


Threat mitigations: user scoping via token; monotonic `clientUpdatedAt`; no guest diary sync.

---

## 4. Conflict strategy

**LWW** по `clientUpdatedAt` (fallback: `updatedAt`) на уровне целого meal-документа.

| | |
|---|---|
| Почему LWW | Проще offline-first; совпадает с Zustand persist; меньше edge cases на gateway |
| Soft-delete | tombstone с `deletedAt` + `clientUpdatedAt`; более новый tombstone побеждает recreate и наоборот |
| Когда merge имел бы смысл | concurrent edit **разных** `items[]` на двух устройствах — редко; field-merge дороже и ошибочнее для состава блюда |
| Server | сравнивает incoming `clientUpdatedAt` с stored; older write → silent ignore + return winner |

Multi-device: последний записавший meal целиком побеждает; UI не пытается мержить ингредиенты посередине.

---

## 5. Stays client-only

| Что | Почему |
|-----|--------|
| Meal photo **blobs** | **Намеренно никогда на сервере** — только Filesystem + URI stubs в meal/favorite sync |
| `selectedDate` (diary UI) | ephemeral navigation |
| `ai-food-model-test` | dev UI |
| `deviceId` generation | локальный id; на сервере — `Device` row |
| `ai-food-usage` snapshot | кэш квоты; SoT — `/usage` |
| Session token (`ai-food-auth`) | JWT локально; SoT user — Postgres `User` |

---

## 6. Phased rollout

| Phase | Scope | Outcome (one line) |
|-------|--------|-------------------|
| **A** | Profile | Done: `{ profile, targets, micronutrientTargets? }` |
| **B** | Diary P0 | Done |
| **C** | Weight + favorites | Done |
| **D** | Settings P2 | Done: `POST /user/settings/sync` |
| — | Images | **Cancelled** — photos stay on device forever |

---

## 7. Remaining out of scope

- Meal photo blob upload (**permanent product decision** — не P3)
- Per-field live sync while editing meal UI
- Subscription gate on user-data sync

См. также: [AI-GATEWAY.md](./AI-GATEWAY.md), [SUBSCRIPTION.md](./SUBSCRIPTION.md).
