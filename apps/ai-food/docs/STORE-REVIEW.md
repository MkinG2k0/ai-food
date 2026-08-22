# Store review pipeline (Play / App Store)

**Статус:** черновик продуктово-инженерного чеклиста. Не блокер текущего Android/web релиза через APK/PWA.

Связанные решения:

- Фото приёмов **не на сервере** — конфиденциальность ([USER-DATA-SYNC.md](./USER-DATA-SYNC.md))
- iOS native — пока нет
- Server account-delete — **есть** (`DELETE /auth/me` + Settings)
- Health / БАДы — пока не делаем
- Биллинг сейчас — T-Bank web checkout ([SUBSCRIPTION.md](./SUBSCRIPTION.md))

---

## Зачем отдельный пайплайн

Публикация в **Google Play** и особенно **App Store** — это не «собрал APK», а пакет: политика, Data safety / Privacy Nutrition Labels, удаление аккаунта, правила платежей, скриншоты, возрастной рейтинг. Без этого review режет даже рабочее приложение.

---

## Слои (что готовить)

### 1. Юридические страницы (уже почти есть)

| Артефакт | Зачем магазину | Сейчас |
|----------|----------------|--------|
| Политика конфиденциальности (URL) | Обязательна в листинге | Сайт / in-app legal |
| Условия / оферта | Подписка, возвраты | Есть |
| Явный текст про фото | Data safety: «photos not collected/stored on server» | **Готово** в политике: фото не на сервере, только транзитный AI-анализ (`privacyContent.ts`) |

Перед submit: публичный HTTPS URL политики, тот же текст в Play Console / App Store Connect.

### 2. Data safety / Privacy labels

Заполнить честно:

| Данные | Collect? | Linked to user? | On server? |
|--------|----------|-----------------|------------|
| КБЖУ / дневник / вес / профиль | да (после логина) | да | да |
| Фото еды | **нет на сервере** | — | только device; в analyze — transient |
| Telegram id / session | да | да | да |
| Платежи | через T-Bank | да | да (метаданные платежа) |

Формулировка для ревьюеров: *Meal photos stay on device; server never persists image blobs (privacy).*

### 3. Account deletion

Apple требует **удаление аккаунта из приложения**, если есть аккаунт. Google Play Data safety тоже давит на delete.

**Сделано:** `DELETE /auth/me` + кнопка «Удалить аккаунт» в настройках (BottomSheet с подтверждением) → wipe серверных данных + локальный `signOut()`.

### 4. Биллинг под платформу (самый жёсткий слой)

| Канал | Что обычно требуют | Конфликт с текущим T-Bank |
|-------|--------------------|---------------------------|
| Web / PWA / сайт | T-Bank ок | Как сейчас |
| Google Play (цифровой товар внутри приложения) | Часто Play Billing; внешние платежи ограничены политикой | Годовая лицензия через T-Bank **внутри APK** может не пройти |
| App Store | IAP (StoreKit) для digital goods почти всегда | T-Bank in-app — высокий риск reject |

Варианты стратегии (выбрать до iOS/Play listing):

1. **Reader / external purchase:** приложение бесплатно качает контент; покупка только на сайте (узкие исключения Apple/Google, меняются).
2. **Dual billing:** Store IAP на iOS/Android store builds; T-Bank на web.
3. **Side-load / web-only monetization:** Play listing без IAP не публиковать; APK раздавать иначе — проще инженерия, хуже дистрибуция.

Пока iOS нет и Play listing не цель — T-Bank остаётся каноном. Перед store: отдельное решение по биллингу, не «потом как-нибудь».

### 5. Технический release train

| Шаг | Android (Play) | iOS (позже) |
|-----|----------------|-------------|
| Native project | `android/` есть | `cap add ios` + Xcode |
| CI | signed AAB, versionCode bump | Archive + TestFlight |
| Env | `.env.mobile` / CI secrets | то же + Apple certs |
| Smoke | analyze, login, sync, paywall | то же + camera permissions strings |
| Privacy Manifest / permissions | Camera, Notifications (когда будут reminders) | NSCameraUsageDescription и т.д. |

### 6. Напоминания (бэклог, ок делать раньше store)

Локальные notifications не требуют store, но для Play/App Store понадобятся:

- permission copy
- канал Android
- отключение в Settings

Можно делать до store-пайплайна.

---

## Рекомендуемый порядок, когда созреем к магазинам

1. ~~Политика: явная фраза про «фото не храним на сервере (только транзитный analyze)»~~ — **готово** (`apps/ai-web/src/lib/legal/privacyContent.ts`, дата редакции 2026-08-23).
2. Data safety forms под реальные sync-поля.
3. ~~Account delete~~ — **готово** (`DELETE /auth/me` + Settings).
4. Решение по **биллингу** (IAP vs web-only vs dual).
5. iOS Capacitor project + TestFlight.
6. Play AAB + review.

До п.4 можно спокойно жить на web + Android sideload/APK.

---

## Не путать с продуктовым scope

| Тема | Продукт сейчас | Store later |
|------|----------------|-------------|
| Фото на сервере | нет, навсегда (конфиденциальность) | писать в Privacy labels |
| iOS | нет | когда берём App Store |
| Account delete | `DELETE /auth/me` + Settings | must перед Apple (готово) |
| T-Bank | канон web/Android вне IAP | пересмотр при store listing |
| Reminders | бэклог, можно делать | permission strings |
| Health / БАДы | не надо | — |
