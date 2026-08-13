# Server-side user data persistence

**Последнее обновление:** 2026-08-13

Design-only: inventory local vs server, gaps, P0 diary sketch, conflict strategy, rollout. **Реализации sync API / Prisma Meal в этом документе нет** — только контракт для будущего quick/phase.

**Monorepo:** design живёт в `apps/ai-food/docs`; реализация позже — `apps/ai-app` (Prisma + Express) + клиентские sync hooks в `apps/ai-food`.

Мотивация: restore дневника/веса/избранного после Telegram login на другом устройстве. Дневник, ручной ввод, штрихкод, статистика, онбординг, настройки — **бесплатно всегда** ([SUBSCRIPTION.md](./SUBSCRIPTION.md)); sync **не** гейтить подпиской.

Auth-паттерн для будущих user-data роутов: `X-User-Token` (как `PUT /auth/profile` / `putNutritionProfile`).

---

## 1. Inventory (as-of audit 2026-08-13)

### Client-only (Capacitor Preferences / Zustand persist / Filesystem)

| Store / key | Данные |
|-------------|--------|
| `ai-food-diary` | `meals[]` — КБЖУ, items, portions, grams, imageUri(s), micronutrients, healthiness, status, timestamps |
| `ai-food-favorites` | `favorites[]` (max 50, включая image refs) |
| `ai-food-weight` | weight `entries[]` + `goalKg` |
| `ai-food-settings` | `customInstructions`, feature flags, `aiModel`, `calendarRingMode` |
| `ai-food-profile` | `profile`, `targets` (DailyTargets), **`micronutrientTargets`** — часть синкается (см. ниже) |
| `ai-food-auth` | session token локально (на сервере — `User`) |
| `ai-food-model-test` | UI state model-test (dev) |
| `deviceId` | заголовок `X-Device-Id` |
| meal images | Capacitor Filesystem (локальные URI) |
| `ai-food-usage` | localStorage snapshot квоты |

### Already on server (Postgres / Prisma `apps/ai-app`)

| Model | Релевантные поля |
|-------|------------------|
| `User` | `telegramId`, names, `photoUrl`, consent, **`nutritionProfile` Json**, subscription* |
| `Device` | `deviceId`, optional `userId` |
| `UsageEvent` | kind + device/user |
| `Payment` / `PromoCode` / `AppSettings` | billing |
| `GatewayRequest` | observability |

**Нет** моделей `Meal`, `Favorite`, `WeightEntry`, `UserSettings` — на момент аудита.

### Already synced

| Данные | Как |
|--------|-----|
| Auth → `User` | Telegram / demo login → JWT |
| Nutrition profile | `PUT /auth/profile` + `GET /auth/me` (`X-User-Token`); payload `{ profile, targets }` |
| Usage / quota + billing | `/usage`, `/billing/*` |
| Guest → user device linking | при логине |

---

## 2. Gaps (prioritized)

| Priority | Gap | Почему |
|----------|-----|--------|
| **P0** | Diary `meals[]` | Ядро продукта; cross-device restore после login |
| **P1** | Weight history + favorites | Статы / быстрый add; меньше объём, чем diary |
| **P2** | Settings (`customInstructions`, UI prefs, model override) | Удобство; не блокирует restore дневника |
| **P3** | Meal photos (blob upload) | Размер, consent, storage; до P3 — URL/null stubs |
| **P2-adjacent** | `useProfileStore.micronutrientTargets` (`MicronutrientEstimate[] \| null`) | **Подтверждено:** живёт только в persist `ai-food-profile`. `NutritionProfilePayload` / `User.nutritionProfile` = `{ profile: UserProfile, targets: DailyTargets }` (ккал/БЖУ/клетчатка) — **без** `micronutrientTargets`. `syncNutritionProfileToServer` шлёт только `{ profile, targets }`. После login на новом устройстве нормы микронутриентов для Stats chart не восстанавливаются с сервера (нужен re-onboarding AI или будущий sync). |

Sync diary/manual/barcode/stats/settings **не** должен требовать `hasActiveSubscription`.

---

## 3. P0 diary sync sketch

### Proposed Prisma `Meal` (design only)

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

### API sketch (gateway, `X-User-Token`)

**Primary recommendation: bulk sync** `POST /user/meals/sync`

| | |
|---|---|
| Auth | `X-User-Token` (обязателен; **нет** anonymous diary sync) |
| Body (sketch) | `{ since?: ISO, upserts: MealPayload[], deletes: { id, clientUpdatedAt }[] }` |
| Response | `{ meals: MealPayload[], tombstones?: id[] }` — серверный snapshot / delta после merge |
| Ownership | все writes scoped к `userId` из токена; reject чужие id |

**Почему bulk, не чистый CRUD:** дневник offline-first (Capacitor Preferences); после login на втором устройстве нужен один round-trip «забрать всё / отдать локальные изменения». LWW естественно ложится на batch с `clientUpdatedAt`.

Опционально позже: `GET/PUT/DELETE /user/meals/:id` для точечных UI-операций — не блокер P0.

Images в P0: передавать `imageUri`/`imageUris` как optional string/null stubs (локальные пути на другом девайсе бесполезны); полный upload — Phase E / P3 + explicit consent.

Threat mitigations (design): user scoping via token; monotonic `clientUpdatedAt`; no guest diary sync.

---

## 4. Conflict strategy

**Рекомендация по умолчанию: LWW** по `clientUpdatedAt` (fallback: `updatedAt`) на уровне целого meal-документа.

| | |
|---|---|
| Почему LWW | Проще offline-first; совпадает с Zustand persist; меньше edge cases на gateway |
| Soft-delete | tombstone с `deletedAt` + `clientUpdatedAt`; более новый tombstone побеждает recreate и наоборот |
| Когда merge имел бы смысл | concurrent edit **разных** `items[]` на двух устройствах — редко; field-merge дороже и ошибочнее для состава блюда |
| Server | сравнивает incoming `clientUpdatedAt` с stored; older write → 409 или silent ignore + return winner |

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
| **B** | Diary P0 | Meals CRUD/bulk sync + Prisma `Meal`; cross-device diary restore |
| **C** | Weight + favorites | History и избранное на сервере |
| **D** | Settings | `customInstructions` / UI prefs (и опционально `aiModel`) |
| **E** | Images P3 | Blob storage + consent; замена URI stubs |

---

## 7. Out of scope for this quick task

- Нет Prisma migrations / модели `Meal` в `apps/ai-app`
- Нет Express routes `/user/meals*`
- Нет client sync hooks / Zustand ↔ server adapters
- Implementation — отдельный future quick/phase после approve этого design

См. также: [AI-GATEWAY.md](./AI-GATEWAY.md), [SUBSCRIPTION.md](./SUBSCRIPTION.md).
