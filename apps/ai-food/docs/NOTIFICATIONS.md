# Локальные уведомления AI Food

## Зачем

Дневник питания работает только когда пользователь открывает приложение. Локальные напоминания возвращают человека в привычку записывать приёмы, не терять серию и вовремя фиксировать вес — без серверного push и без доступа к фото/данным на бэкенде.

**В scope:** только `@capacitor/local-notifications` на Android (Capacitor). На web/PWA планировщик no-op.

**Вне scope:** друзья, биллинг, новости — позже через server push.

---

## Типы уведомлений

| ID | Тип | Когда | Условие | Текст (intent) |
|----|-----|-------|---------|----------------|
| `meal-breakfast` | Слот завтрака | Настраиваемое время (08:30) | Нет `ready`-приёма в ±2 ч от слота в этот день | «Запиши завтрак» |
| `meal-lunch` | Слот обеда | 13:00 | То же | «Запиши обед» |
| `meal-dinner` | Слот ужина | 19:30 | То же | «Запиши ужин» |
| `streak-risk` | Серия под угрозой | 20:30 ежедневно | `currentLength ≥ 1` и сегодня 0 ready-приёмов | «Запиши хотя бы один приём — серия X дней» |
| `streak-milestone` | Веха серии | 08:00 на следующее утро | Вчера серия достигла 3/7/14/30/60/100; приложение **не** открывали вчера после 18:00 | «Вчера серия выросла до N 🔥» |
| `weight-weekly` | Вес | Воскресенье 10:00 | В профиле есть `targetWeight` и последняя запись веса > 7 дней назад | «Запиши вес — отслеживай прогресс» |
| `analyze-error` | Ошибка разбора | Сразу | `meal.status === 'error'` после ухода в фон во время `analyzing` | «Не удалось разобрать приём — нажми, чтобы повторить» |

Вехи серии: `[3, 7, 14, 30, 60, 100]` (`STREAK_MILESTONES` в `entities/streak`).

---

## Настройки (`ai-food-settings`, `reminders`)

```
☑ Напоминания о еде          reminders.enabled (master)
  ☑ Завтрак 08:30            reminders.breakfast.{ enabled, hour, minute }
  ☑ Обед 13:00               reminders.lunch.*
  ☑ Ужин 19:30               reminders.dinner.*
  ☑ Не потерять серию        reminders.streakAtRisk
  ☑ Запись веса (раз в нед.) reminders.weightWeekly
```

- Master **выкл** → `cancelAll` + не планировать.
- Подтипы можно выключать по отдельности.
- Настройки **локальные** (не в `POST /user/settings/sync`).

Runtime-состояние (`ai-food-reminders-runtime`):

- `lastForegroundAt` — ISO, для вех серии.
- `lastTimezoneOffsetMinutes` — переплан при смене TZ.
- `notifiedMilestoneKeys` — уже отправленные вехи (`dateKey:milestone`).
- `backgroundAnalyzeMealIds` — приёмы в `analyzing` при уходе в фон.

---

## Алгоритм планирования

1. **Окно:** ~7 календарных дней от «сегодня» (локальная TZ).
2. **Вход:** meals, profile, weight entries, streak length, settings, runtime.
3. **Выход:** массив `ScheduledReminder` с стабильным `id`, `at`, `body`, `route`.
4. **Применение (native):**
   - `LocalNotifications.cancel({ notifications: [{ id }] })` для всех id диапазонов 10 000–79 999.
   - `createChannel` «Напоминания о питании» (`meal-reminders`).
   - `schedule` только будущие `at`.
5. **Переплан** при:
   - launch / foreground (`App.appStateChange`, `visibilitychange`);
   - изменении diary / settings / profile / weight / streak persist;
   - смене `getTimezoneOffset()`;
   - переходе analyze → error в фоне.

**Стабильные id:** база × 10 000 + индекс дня (0–6) + подтип; analyze-error — `70000 + hash(mealId) % 10000`.

---

## Платформы

| Платформа | Поведение |
|-----------|-----------|
| Android (Capacitor) | Полная реализация, channel, `POST_NOTIFICATIONS` |
| Web / PWA | No-op; UI настроек работает |
| iOS | Не настроено в этой итерации (API совместим, manifest/channel — позже) |

Лимиты Android: до ~500 запланированных локальных уведомлений; 7-дневное окно × ~5 типов укладывается с запасом.

---

## Разрешения

1. После завершения онбординга (профиль есть, master включён) — один contextual prompt.
2. При первом включении master в настройках — `requestPermissions`.
3. Отказ → пояснение в настройках, без падений; планирование пропускается.

Android 13+: `POST_NOTIFICATIONS` в `AndroidManifest.xml`.

---

## Deep links

| Tap | Route |
|-----|-------|
| Слоты / серия / вес | `/` |
| Analyze error | `/meal/:id` |

Extra: `{ route: '/meal/…' }`. Обработчик: `localNotificationActionPerformed` + `parseAppDeepLink` для `aifood://meal/:id`.

---

## Store review

- Канал: «Напоминания о питании» — питание и привычки, не маркeting.
- Тексты на русском, без давления и ложной срочности.
- Нет re-engagement без действия пользователя (master toggle).
- Analyze-error — transactional (сбой операции пользователя).

---

## Код

| Область | Путь |
|---------|------|
| Pure schedule | `src/features/reminders/model/computeReminderSchedule.ts` |
| Native wrapper | `src/features/reminders/model/localNotificationsNative.ts` |
| Lifecycle | `src/features/reminders/ui/ReminderLifecycle.tsx` |
| Settings UI | `src/features/reminders/ui/RemindersSettingsSection.tsx` |
| Prefs | `useSettingsStore.reminders` |

Тесты: `computeReminderSchedule.test.ts` — условия слотов, серии, веса, вех.
