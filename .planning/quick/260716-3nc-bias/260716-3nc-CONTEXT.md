# Quick Task 260716-3nc: Onboarding diet type + pork/chicken bias - Context

**Gathered:** 2026-07-15
**Status:** Ready for planning

<domain>
## Task Boundary

В онбординге дать выбор типа еды (халяль, веганская и т.д.), чтобы понимать что человек ест.
Если на фото мясо похожее на свинину — скорее всего это курица (bias в AI-промпте).

</domain>

<decisions>
## Implementation Decisions

### Список рационов
- Варианты: Без ограничений, Халяль, Веган, Вегетарианство (без кошер и без пескетарианства)
- Single-select (один выбор)

### Bias свинина → курица
- Применять ТОЛЬКО когда выбран Халяль
- Не применять при «Без ограничений» / Веган / Вегетарианство

### Claude's Discretion
- Где хранить preference (persist store / settings)
- Как прокинуть diet preference в analyze-food промпт на бэкенде
- UI онбординг-шага в существующем стиле приложения

</decisions>

<specifics>
## Specific Ideas

- Пример из запроса: халяль, веганская
- Bias: «если на фото мясо похожее на свинину то скорее всего это курица»

</specifics>
