# Roadmap: AI Food

## Overview

Brownfield web-MVP: заменить mock-бэкенд на OpenAI Vision proxy, довести flow «фото → AI → правка → сохранение → дневник» до показуемого состояния с localStorage-персистентностью и понятными ошибками. Шесть фаз следуют зависимостям: backend proxy → анализ с loading → human-in-the-loop на Result → дневник → ошибки → сквозная навигация.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Backend OpenAI Vision Proxy** — Реальный анализ еды через OpenAI на бэкенде с типизированными ошибками
- [ ] **Phase 2: Photo Capture & Analysis Loading** — Выбор фото, превью и loading state при реальном AI-запросе
- [ ] **Phase 3: Result Review & Confirmation** — Просмотр КБЖУ, правка порции, явное подтверждение сохранения
- [ ] **Phase 4: Diary & Persistence** — Дневник с localStorage, сводка на Home, редактирование записей
- [ ] **Phase 5: Error Handling & Feedback** — Inline-ошибки анализа и toast-уведомления при успехе/сбое
- [ ] **Phase 6: End-to-End Flow & MVP Polish** — Сквозной happy path без тупиков, готовность к демо

## Phase Details

### Phase 1: Backend OpenAI Vision Proxy
**Goal**: Пользователь получает реальный AI-анализ еды через защищённый backend proxy (ключ не на клиенте)
**Depends on**: Nothing (first phase)
**Requirements**: AI-01, AI-02, ERR-03
**Success Criteria** (what must be TRUE):
  1. User's food photo triggers real OpenAI Vision analysis instead of a hardcoded mock response
  2. User receives structured nutrition data (food name, calories, protein, carbs, fat, fiber, confidence) from the backend
  3. When analysis cannot complete (timeout, invalid image, rate limit, service error), backend returns distinguishable typed error codes the app can surface
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md — Install packages, Vitest scaffold, Wave 0 failing test stubs
- [x] 01-02-PLAN.md — Load dotenv, replace mock route with real OpenAI Vision proxy

### Phase 2: Photo Capture & Analysis Loading
**Goal**: Пользователь выбирает фото и видит понятный процесс анализа без зависшего интерфейса
**Depends on**: Phase 1
**Requirements**: PHOTO-01, PHOTO-02, AI-03
**Success Criteria** (what must be TRUE):
  1. User can select a food photo via the device file picker (`image/*`)
  2. User sees a preview of the selected photo on the result screen before saving
  3. User sees a loading state (skeleton or spinner) while real analysis runs and the UI stays responsive
**Plans**: TBD
**UI hint**: yes

### Phase 3: Result Review & Confirmation
**Goal**: Пользователь проверяет AI-оценку, корректирует значения и явно подтверждает сохранение
**Depends on**: Phase 2
**Requirements**: UX-01, UX-02, UX-03, UX-04, UX-05
**Success Criteria** (what must be TRUE):
  1. User sees full nutrition breakdown (calories, protein, carbs, fat, fiber) after analysis completes
  2. User sees a confidence indicator with honest «estimate» messaging (not clinical accuracy claims)
  3. User can adjust portion (0.5×–2× scale) and/or edit macro values before saving
  4. User can retake or replace the photo from the result screen without losing navigation context
  5. User must explicitly confirm save — meals are never auto-added to the diary
**Plans**: TBD
**UI hint**: yes

### Phase 4: Diary & Persistence
**Goal**: Подтверждённые приёмы пищи сохраняются в дневник и переживают перезагрузку браузера
**Depends on**: Phase 3
**Requirements**: DIARY-01, DIARY-02, DIARY-03, DIARY-04, DIARY-05
**Success Criteria** (what must be TRUE):
  1. User can save a confirmed meal to the diary with an automatic timestamp
  2. User sees today's calorie summary on the home screen updating after saves
  3. User sees meal history grouped by date on the diary page
  4. User's diary entries remain after a browser refresh (localStorage)
  5. User can edit or delete existing diary entries
**Plans**: TBD
**UI hint**: yes

### Phase 5: Error Handling & Feedback
**Goal**: Пользователь всегда понимает, что произошло при сбое или успешном сохранении
**Depends on**: Phase 1, Phase 4
**Requirements**: ERR-01, ERR-02
**Success Criteria** (what must be TRUE):
  1. User sees a clear inline error on the result screen when analysis fails, with an option to retake the photo
  2. User sees a success toast when a meal saves successfully
  3. User sees an error toast when analysis or save fails
**Plans**: TBD
**UI hint**: yes

### Phase 6: End-to-End Flow & MVP Polish
**Goal**: Пользователь проходит полный happy path без тупиков — приложение готово к демо
**Depends on**: Phase 5
**Requirements**: NAV-01
**Success Criteria** (what must be TRUE):
  1. User can complete Home → Add Food → Result → save → Home without dead ends or broken back navigation
  2. User can open the diary from the main flow and return without getting stuck
  3. Full happy path (photo → AI analysis → edit → save → diary → home summary) works reliably for a live demo
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Backend OpenAI Vision Proxy | 2/2 | Complete | 2026-06-25 |
| 2. Photo Capture & Analysis Loading | 0/TBD | Not started | - |
| 3. Result Review & Confirmation | 0/TBD | Not started | - |
| 4. Diary & Persistence | 0/TBD | Not started | - |
| 5. Error Handling & Feedback | 0/TBD | Not started | - |
| 6. End-to-End Flow & MVP Polish | 0/TBD | Not started | - |
