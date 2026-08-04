# Task 4 Report: Legal content modules

**Status:** ✅ Complete  
**Date:** 2026-08-04  
**Commit:** `04f59f6` — `feat(ai-food): add legal terms and privacy content modules`

## Summary

Реализованы чистые content-модули для юридических документов (оферта и политика ПДн) в `apps/ai-food/src/shared/legal/`. UI-страницы — Task 5.

## Files created

| File | Purpose |
|------|---------|
| `types.ts` | `LegalSection = { title, paragraphs }` |
| `legalConfig.ts` | Плейсхолдеры реквизитов, `revisionDate`, `formatSellerBlock()` |
| `termsContent.ts` | `buildTermsSections({ amountKopecks, durationDays })` — 9 секций |
| `privacyContent.ts` | `buildPrivacySections()` — 9 секций |
| `termsContent.test.ts` | TDD: интерполяция цены + fallback |

## TDD flow

1. **RED** — тест без модулей: import resolution fail ✓
2. **GREEN** — все модули реализованы, 2/2 теста PASS ✓

```
pnpm --filter ai-food test -- src/shared/legal/termsContent.test.ts
✓ interpolates rubles and duration when price known
✓ uses fallback wording when price null
```

## Interfaces delivered

- `LegalSection` — тип секции документа
- `legalConfig` — плейсхолдеры `[ФИО ИП]`, `[ИНН]`, `[ОГРНИП]`, `[Адрес]`, `[email]`, `[телефон]`; `revisionDate: '2026-08-04'`
- `formatSellerBlock(): string` — блок реквизитов ИП
- `buildTermsSections(opts)` — 9 секций оферты с динамической ценой
- `buildPrivacySections()` — 9 секций политики ПДн

## Terms sections (оферта)

1. Исполнитель
2. Предмет договора
3. Цена и срок — API interpolation / fallback
4. Акцепт оферты (T‑Bank)
5. Предоставление доступа (CONFIRMED)
6. Ограничение ответственности (не медуслуга, КБЖУ приблизительны)
7. Возврат денежных средств (REFUNDED → деактивация)
8. Претензии (email / Telegram)
9. Реквизиты + disclaimer шаблонов

## Privacy sections (ПДн)

1. Оператор
2. Категории данных
3. Цели обработки
4. Правовые основания (152‑ФЗ)
5. Передача третьим лицам (T‑Bank, OpenRouter, хостинг)
6. Трансграничная передача
7. Сроки и защита
8. Права субъекта
9. Реквизиты оператора

## Placeholders compliance

Все реквизиты — только плейсхолдеры из брифа. Реальные ИНН/ОГРНИП не использовались.

## Concerns / notes for Task 5

- UI-страницы (`/legal/terms`, `/legal/privacy`) и ссылки в Settings — следующая задача
- `buildPrivacySections()` без unit-тестов (бриф требовал только terms price test)
- Перед продом владелец заполняет плейсхолдеры в `legalConfig.ts`
- Рекомендуется юридическая проверка текстов перед публикацией

## Scope excluded (per brief)

- Legal pages / routes
- Settings links
- `fetchSubscriptionPrice` integration in UI
