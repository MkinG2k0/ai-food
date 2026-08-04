# Legal documents (Условия / Приватность) + subscription price API

**Date:** 2026-08-04  
**Status:** Approved  
**Repos:** `ai-food` (UI + texts), `ai-app` (price endpoint)  
**Approach:** In-app legal pages + public `GET /billing/price`

## Goal

Опубликовать в приложении **Условия** (публичная оферта ИП) и **Приватность** (политика ПДн), с реквизитами через плейсхолдеры. Цену лицензии в UI оферты и на экране оплаты брать с gateway, а не хардкодить на клиенте.

## Non-goals

- Чекбоксы согласия на ПДн / акцепт оферты на логине или `/subscribe`
- Ссылки на документы вне блока «О приложении»
- Реальные реквизиты ИП (только плейсхолдеры до заполнения владельцем)
- Уведомление в Роскомнадзор, cookie-banner, внешний хостинг документов
- Юридическая экспертиза текстов — шаблоны под продукт, не замена консультации юриста

## Product decisions

| Вопрос | Решение |
|--------|---------|
| Статус продавца | ИП |
| Реквизиты | Плейсхолдеры: `[ФИО ИП]`, `[ИНН]`, `[ОГРНИП]`, `[Адрес]`, `[email]`, `[телефон]` |
| Где ссылки | Только «Настройки → О приложении» |
| Хранение текстов | В приложении (роуты + контент в репо) |
| Цена | С бэка: `SUBSCRIPTION_PRICE_KOPECKS` / default 10 000 коп. |

## Gateway: price endpoint

Уже есть `getSubscriptionPriceKopecks()` и `getSubscriptionDurationDays()` в `apps/ai-app/src/lib/subscription.ts`. Subscribe создаёт платёж с этой суммой; клиент сейчас дублирует `PRICE_RUB = 100`.

### `GET /billing/price` (public, без auth)

Response JSON:

```json
{
  "amountKopecks": 10000,
  "currency": "RUB",
  "durationDays": 365
}
```

- `amountKopecks` — из `getSubscriptionPriceKopecks()`
- `durationDays` — из `getSubscriptionDurationDays()`
- Без БД и без T‑Bank; всегда 200 при живом процессе
- Тест: default и override через env

Клиент: `fetchSubscriptionPrice()` в `features/billing`, использование на:

1. `SubscribePage` — убрать `PRICE_RUB`
2. Страница «Условия» — сумма и срок в тексте оферты (fallback: «см. актуальный тариф на экране оплаты» / скелетон, пока грузится)

## Frontend: legal pages

### Routes (`ai-food`)

- `/legal/terms` — Условия (оферта)
- `/legal/privacy` — Приватность  
Без `ProfileGuard` — доступны до онбординга. UI: `SubpageShell`, назад → `/settings`.

### Settings

В секции «О приложении» две кнопки (как «Новости»):

- Условия → `/legal/terms`
- Приватность → `/legal/privacy`

### Content layout

```
shared/legal/
  legalConfig.ts      # плейсхолдеры реквизитов + дата редакции
  termsContent.ts     # buildTermsSections({ amountKopecks, durationDays })
  privacyContent.ts   # buildPrivacySections()
pages/legal/
  ui/LegalDocumentPage.tsx  # title + sections renderer
  ui/TermsPage.tsx          # fetch price → buildTermsSections → LegalDocumentPage
  ui/PrivacyPage.tsx        # LegalDocumentPage + privacy sections
```

Рендер: секции `{ title, paragraphs: string[] }` простым JSX (без новой markdown-зависимости). Дата «Редакция от …» в шапке. Пока цена грузится — скелетон/«загрузка…» в блоке цены; при ошибке API — текст «актуальная цена на экране оплаты», без хардкода рублей.

### Условия (оферта) — обязательные разделы

1. Исполнитель (ИП + плейсхолдеры)
2. Предмет: цифровая услуга — годовая лицензия AI Food (AI-анализ/уточнение без лимита на срок)
3. Цена и срок — **с API** (`amountKopecks` / 100 → ₽, `durationDays`)
4. Акцепт: оплата через T‑Bank = принятие оферты
5. Порядок предоставления доступа после `CONFIRMED`
6. Отказ от медсоветов / оценочный характер КБЖУ
7. Возврат: полный refund (`REFUNDED`) → лицензия деактивируется; частичный — по согласованию
8. Ответственность, претензии (контакты из конфига)
9. Реквизиты

### Приватность — обязательные разделы

1. Оператор (ИП + плейсхолдеры) и контакты по ПДн
2. Категории: Telegram ID, имя, username, photoUrl; deviceId; метаданные платежей (без PAN); фото еды на время анализа; локальный профиль/дневник на устройстве
3. Цели: аккаунт, квоты, оплата, AI-анализ, работа приложения
4. Основания: договор (оферта), согласие / законный интерес где применимо
5. Третьи лица: T‑Bank; OpenRouter / AI-провайдеры; хостинг
6. Трансграничная передача (AI-провайдер)
7. Сроки хранения, меры защиты (общо)
8. Права субъекта (доступ, уточнение, удаление, отзыв — через контакт)
9. Реквизиты оператора

## Testing

**ai-app**

- `GET /billing/price` → default 10000 / 365
- Env override `SUBSCRIPTION_PRICE_KOPECKS` / `SUBSCRIPTION_DURATION_DAYS`

**ai-food**

- Настройки → Условия / Приватность открываются, назад в настройки
- Роуты без профиля
- Subscribe и оферта показывают цену с API (mock fetch в тестах)

## Env / ops

Новых env нет. Перед продом владелец подставляет реквизиты в `legalConfig.ts`. Цена по-прежнему `SUBSCRIPTION_PRICE_KOPECKS` на gateway.

## Disclaimer

Тексты — продуктовые шаблоны под 152‑ФЗ / ЗоЗПП / оферту. Перед продакшеном рекомендуется проверка юристом; выдуманные ИНН/ОГРНИП не публиковать.
