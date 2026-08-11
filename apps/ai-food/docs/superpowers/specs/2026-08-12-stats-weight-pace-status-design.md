# Stats: статус темпа плана (отстаём / впереди)

**Дата:** 2026-08-12  
**Статус:** Approved  
**Область:** `apps/ai-food` — карточка прогресса веса на экране «Статистика»

## Проблема

На «Статистике» видны факт, идеальная траектория и срок, но нет явного сигнала, если пользователь **отстаёт** от плана (или идёт **впереди**). График это намекает, но строка остатка и заголовок цели молчат.

## Цель

Сравнивать текущий вес с идеальным на сегодня и показывать на `WeightProgressCard` чип + акцент строки остатка, когда разрыв ≥ 0.5 кг.

## Решения

| Тема | Решение |
|------|---------|
| Критерий | `idealKg = idealWeightAtDate(…, today)`; lag для gain = `ideal − current`, для lose = `current − ideal` |
| Порог | behind / ahead только если \|lag\| ≥ **0.5 кг** |
| Цели | только `lose` / `gain`; `maintain` — без статуса |
| Копирайт | «Отстаём на X.X кг» / «Впереди плана на X.X кг» (`X.X` = \|lag\| с 1 знаком) |
| UI | чип у заголовка; при behind строка остатка `text-amber-700` (или близкий токен) |
| Ahead стиль | чип `text-primary` / `bg-primary/15` (как «Цель достигнута») |
| График | без изменений |
| Legacy | нет `planStart*` / дедлайна / `idealKg` → статуса нет |
| Достигнута цель | статуса нет (чип «Цель достигнута» остаётся) |

## Не в скоупе

- Подсветка линий на `WeightTrendChart`
- Пересчёт калорий / push / настройки
- Предупреждения для `maintain`
- Смена порога пользователем

## Модель

```ts
export type WeightPaceStatus = {
  kind: 'behind' | 'ahead';
  lagKg: number; // absolute, 1 decimal
  label: string;
};

export function evaluateWeightPaceStatus(input: {
  goal: Goal;
  currentKg: number;
  planStartDate?: string | null;
  planStartWeight?: number | null;
  targetWeightDate?: string | null;
  goalKg: number;
  todayYmd?: string;
  reached: boolean;
}): WeightPaceStatus | null;
```

Константа: `PACE_STATUS_EPS_KG = 0.5`.

## UI

- Рядом с заголовком цели (под ним, как у reached): чип с `label`.
- Behind и reached взаимоисключающи (`reached` → null).
- `progressLine` при `behind`: amber; иначе как сейчас.

## Acceptance

1. Gain: current на ≥0.5 кг ниже ideal today → чип «Отстаём на …».
2. Lose: current на ≥0.5 кг выше ideal → behind.
3. Разница &lt; 0.5 → без чипа.
4. Ahead ≥0.5 → «Впереди плана на …».
5. maintain / legacy / reached → без статуса.
6. Unit-тесты на хелпер зелёные.
