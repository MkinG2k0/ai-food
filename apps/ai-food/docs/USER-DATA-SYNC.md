# Server-side user data persistence

**Последнее обновление:** 2026-08-13

P0 diary + **P1 weight/favorites** sync реализованы (`POST /user/meals|weights|favorites/sync`). Документ — контракт + inventory.

**Monorepo:** design в `apps/ai-food/docs`; реализация — `apps/ai-app` (Prisma + Express) + клиентские sync hooks в `apps/ai-food`.

Мотивация: restore дневника/веса/избранного после Telegram login на другом устройстве. Дневник, ручной ввод, штрихкод, статистика, онбординг, настройки — **бесплатно всегда** ([SUBSCRIPTION.md](./SUBSCRIPTION.md)); sync **не** гейтить подпиской.

Auth-паттерн для user-data роутов: `X-User-Token` (как `PUT /auth/profile` / `putNutritionProfile`).

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
- Photo blobs **не** загружаются (только URI stubs)
- Favorites / weight / settings / `micronutrientTargets` — **вне scope** P0 (weight+favorites → P1 ниже)

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

## 1. Inventory (as-of audit 2026-08-13)

### Client-only (Capacitor Preferences / Zustand persist / Filesystem)

| Store / key | Данные |
|-------------|--------|
| `ai-food-diary` | `meals[]` — КБЖУ, items, portions, grams, imageUri(s), micronutrients, healthiness, status, timestamps; + `pendingDeletes` для tombstone clocks |
| `ai-food-favorites` | `favorites[]` + `pendingDeletes` (max 50; image URI stubs) |
| `ai-food-weight` | weight `entries[]` + `goalKg` (+ `clientUpdatedAt` on entries) |
| `ai-food-settings` | `customInstructions`, feature flags, `aiModel`, `calendarRings` |
| `ai-food-profile` | `profile`, `targets` (DailyTargets), **`micronutrientTargets`** — часть синкается (см. ниже) |
| `ai-food-auth` | session token локально (на сервере — `User`) |
| `ai-food-model-test` | UI state model-test (dev) |
| `deviceId` | заголовок `X-Device-Id` |
| meal images | Capacitor Filesystem (локальные URI) |
| `ai-food-usage` | localStorage snapshot квоты |

### Already on server (Postgres / Prisma `apps/ai-app`)

| Model | Релевантные поля |
|-------|------------------|
| `User` | `telegramId`, names, `photoUrl`, consent, **`nutritionProfile` Json**, **`goalKg`**, subscription* |
| `Meal` | client-cuid id, items Json, KBJU fields, `clientUpdatedAt`, soft-delete `deletedAt` |
| `WeightEntry` | id, date (YYYY-MM-DD), kg, `clientUpdatedAt`, soft-delete |
| `Favorite` | id, sourceMealId, name, items Json, macros, image stubs, `clientUpdatedAt`, soft-delete |
| `Device` | `deviceId`, optional `userId` |
| `UsageEvent` | kind + device/user |
| `Payment` / `PromoCode` / `AppSettings` | billing |
| `GatewayRequest` | observability |

**Нет** (ещё) модели `UserSettings`.

### Already synced

| Данные | Как |
|--------|-----|
| Auth → `User` | Telegram / demo login → JWT |
| Nutrition profile | `PUT /auth/profile` + `GET /auth/me` (`X-User-Token`); payload `{ profile, targets }` |
| Diary meals (P0) | `POST /user/meals/sync` (`X-User-Token`); LWW + soft-delete |
| Weight + goalKg (P1) | `POST /user/weights/sync` |
| Favorites (P1) | `POST /user/favorites/sync` |
| Usage / quota + billing | `/usage`, `/billing/*` |
| Guest → user device linking | при логине |

---

## 2. Gaps (prioritized)

| Priority | Gap | Почему |
|----------|-----|--------|
| **P0** | Diary `meals[]` | **Done** |
| **P1** | Weight history + favorites | **Done** — bulk sync + client features |
| **P2** | Settings (`customInstructions`, UI prefs, model override) | Удобство; не блокирует restore дневника |
| **P3** | Meal photos (blob upload) | Размер, consent, storage; до P3 — URL/null stubs |
| **P2-adjacent** | `useProfileStore.micronutrientTargets` (`MicronutrientEstimate[] \| null`) | **Подтверждено:** живёт только в persist `ai-food-profile`. `NutritionProfilePayload` / `User.nutritionProfile` = `{ profile: UserProfile, targets: DailyTargets }` (ккал/БЖУ/клетчатка) — **без** `micronutrientTargets`. `syncNutritionProfileToServer` шлёт только `{ profile, targets }`. После login на новом устройстве нормы микронутриентов для Stats chart не восстанавливаются с сервера (нужен re-onboarding AI или будущий sync). |

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
| `imageUri` / `imageUris` String? / Json? | **stubs** — local path или null; blob upload = P3 |
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

Images в P0: передавать `imageUri`/`imageUris` как optional string/null stubs (локальные пути на другом девайсе бесполезны); полный upload — Phase E / P3 + explicit consent.

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
| `selectedDate` (diary UI) | ephemeral navigation, не данные пользователя |
| `ai-food-model-test` | dev UI |
| `deviceId` generation | локальный id устройства; на сервере — `Device` row |
| `ai-food-usage` snapshot | кэш квоты; SoT — `/usage` |
| Session token (`ai-food-auth`) | JWT локально; SoT user — Postgres `User` |
| Meal photo **blobs** (до P3) | Filesystem; sync metadata only until Phase E |
| `aiModel` override (Settings) | **пока client-only / discretionary.** Food routes уже берут `OPENROUTER_MODEL` на сервере; клиентский override — UX/debug. Синк на сервер возможен в Phase D, но не обязателен; paid AI всё равно gated quota/subscription |

---

## 6. Phased rollout

| Phase | Scope | Outcome (one line) |
|-------|--------|-------------------|
| **A** | Profile | Done: `{ profile, targets }` ↔ `User.nutritionProfile` via `PUT /auth/profile` |
| **B** | Diary P0 | Done: Meals bulk sync + Prisma `Meal`; cross-device diary restore |
| **C** | Weight + favorites | **Done:** `POST /user/weights/sync` + `/user/favorites/sync` + client features |
| **D** | Settings | `customInstructions` / UI prefs (и опционально `aiModel`) |
| **E** | Images P3 | Blob storage + consent; замена URI stubs |

---

## 7. Remaining out of scope

- Settings / `micronutrientTargets` sync (P2)
- Meal photo blob upload (P3)
- Per-field live sync while editing meal UI
- Subscription gate on user-data sync

См. также: [AI-GATEWAY.md](./AI-GATEWAY.md), [SUBSCRIPTION.md](./SUBSCRIPTION.md).
