# Feature Research

**Domain:** AI nutrition tracking (photo → КБЖУ → дневник), web-MVP
**Researched:** 2026-06-24
**Confidence:** HIGH (конкуренты + OpenAI docs + текущая кодовая база); MEDIUM (точность Vision без RAG — подтверждено исследованиями, но не бенчмарками продукта)

## Feature Landscape

### Table Stakes (Users Expect These)

Функции, без которых продукт воспринимается как сломанный. Пользователь не хвалит за их наличие, но уходит, если их нет.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Загрузка фото еды** (file picker, `image/*`) | Все AI calorie apps строятся вокруг «сфотографировал → получил данные». Cal AI, SnapCalorie, MFP Meal Scan — photo-first. | LOW | ✅ Уже есть: `ImagePicker` + `useImageStore`. Web-MVP: file picker достаточно; нативная камера — не table stakes для web. |
| **AI-анализ с индикатором загрузки** | Пользователь ждёт 2–15 с (реальный API vs mock 1.5–3 с). Без skeleton/spinner UX кажется зависшим. | LOW | ✅ UI есть (`ResultPage` skeleton + «Analyzing…»). При переходе на Vision: сохранить ожидание 3–10 с, не обещать «мгновенно». |
| **Отображение КБЖУ** (калории + белки/углеводы/жиры) | Базовый контракт любого calorie tracker. 90% fitness-клиентов трекают именно макросы, не микронутриенты. | LOW | ✅ `NutritionCard` + `NutritionRow`. Минимум для MVP — 4 макро + калории. |
| **Экран подтверждения перед сохранением** | Cal AI, MFP Meal Scan, SnapCalorie — все показывают результат и требуют confirm. «Сфоткал → сразу в дневник» без review — доверие падает, особенно с реальным AI. | LOW | ✅ Частично: кнопки Retake / Save есть. ❌ Нет редактирования значений — критичный gap при замене mock на Vision. |
| **Коррекция AI-оценки перед сохранением** | Реальный Vision ошибается в порциях и идентификации (±15–30% для сложных блюд — норма индустрии). Cal AI: слайдер порции, кнопки ½×–2×; MFP: правка serving size. Без edit пользователи не доверяют дневнику. | MEDIUM | ❌ Не реализовано. **Обязательно для web-MVP с реальным AI** — хотя бы scale multiplier (0.5×–2×) или inline edit калорий/макросов. |
| **Сохранение в дневник** | Core value: «сохранил в дневник». Без persist flow обрывается. | LOW | ✅ `useSaveMeal` → `useDiaryStore.addMeal()`. |
| **Дневная сводка калорий** | Home screen с «сколько съел сегодня» — стандарт всех трекеров (MFP, Cal AI, macro apps). | LOW | ✅ `DailyHeader`: сумма за сегодня + progress bar. |
| **История приёмов пищи** | Пользователь ожидает видеть прошлые записи, не только сегодня. | LOW | ✅ `DiaryPage` с группировкой по дате + `MealList` на Home. |
| **Персистентность дневника** (переживает refresh) | Без localStorage/DB данные теряются — продукт бесполезен после перезагрузки. | LOW | ✅ `useDiaryStore` + Zustand `persist` (`ai-food-diary`). Нужно верифицировать E2E, но архитектурно готово. |
| **Обработка ошибок анализа** | Vision API падает (rate limit, timeout, не еда на фото, плохое качество). Пользователь должен понять, что случилось, и повторить. | LOW–MEDIUM | ⚠️ Частично: inline error + Retake на `ResultPage`. ❌ Toast (Sonner подключён, не используется). Нужны структурированные ошибки с бэкенда. |
| **Превью загруженного фото** | Контекст: «что именно анализировалось». Cal AI и MFP показывают фото рядом с результатом. | LOW | ✅ `previewUrl` на `ResultPage`. |
| **Навигационный flow** Home → Add → Result → Home | Предсказуемый путь без тупиков. | LOW | ✅ 4 маршрута реализованы. |

### Differentiators (Competitive Advantage)

Не обязательны для «работающего» трекера, но формируют позиционирование AI Food vs MFP/Cal AI.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Photo-first без поиска по базе** | Cal AI выигрывает скоростью: нет scrolling по 20M foods (MFP). AI Food = «сфотографировал, готово» — core value из PROJECT.md. | LOW | ✅ Архитектурно заложено. Дифференциатор — отсутствие friction database search, не отдельная фича. |
| **Индикатор уверенности AI** (`confidence`) | Прозрачность: «AI на 72% уверен» снижает frustration при ошибках. Редко в простых MVP, есть у research-grade apps. | LOW | ✅ `NutritionCard` Badge «X% match». С Vision: попросить модель вернуть confidence в structured output. |
| **Клетчатка (fiber) в breakdown** | Чуть глубже базовых макросов; SnapCalorie трекает 100+ нутриентов, но fiber — разумный sweet spot без scope creep. | LOW | ✅ В `NutritionResult`. Vision prompt должен явно запрашивать fiber. |
| **Скорость happy path (<15 с)** | Cal AI позиционируется как «under 15 seconds». Для web-MVP: backend proxy + один Vision call без RAG. | MEDIUM | Зависит от модели, размера изображения, cold start. Оптимизация: resize на бэкенде, `gpt-4o-mini` для cost/speed. |
| **Честный AI без претензии на клиническую точность** | SnapCalorie/SnapCalorie research: ±5–15% для сложных блюд. Продукт, который говорит «оценка, проверьте и поправьте» — доверие выше, чем «97% accuracy» без доказательств. | LOW | UX copy + confidence badge + edit-before-save. Не фича-код, а product positioning. |
| **Web-first без установки** | Cal AI / MFP — native apps. Web-MVP = мгновенный доступ по ссылке, демо для пользователей без App Store. | LOW | ✅ Vite + responsive. Дифференциатор для демо-стадии. |
| **Backend proxy для API key** | Безопасность + единая точка rate limiting. Конкуренты не показывают это пользователю, но это enabler для production-ready MVP. | MEDIUM | ❌ Pending — ключевая техническая фича следующего цикла. |

### Anti-Features (Commonly Requested, Often Problematic)

Функции, которые кажутся логичными, но раздувают scope или конфликтуют с core value.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Поиск по базе 20M продуктов** (MFP-style) | «А если AI ошибся?» | Противоречит photo-first value; требует лицензии Nutritionix/USDA API, поисковый UI, синхронизацию порций. Months of work. | Edit-before-save + retake photo. Database — v2 после PMF. |
| **RAG + USDA/FNDDS на MVP** | Точность: Vision hallucinate nutrition values (Nature Communications Medicine, 2025). | +2–4 недели: vector DB, ETL, retrieval pipeline. Overkill для «показать пользователям». | Vision-only для MVP; RAG — отдельная фаза, если accuracy станет blocker. |
| **Мульти-item декомпозиция тарелки** | «На фото 5 блюд — разбей каждое». | MFP делает через suggestions list; Cal AI часто суммирует. Сложный prompt + UI для N items. | MVP: один `foodName` + суммарные макросы за приём. Multi-item — v1.x. |
| **Barcode / label scanning** | Точность для packaged foods. | Отдельный flow, камера API, база штрихкодов. Web barcode — плохой UX. | Photo + manual edit для упаковки. Barcode — native phase. |
| **LiDAR / depth sensor для объёма** | SnapCalorie differentiator — точные порции. | Только iPhone Pro native; недоступно в web. | Visual estimation + user correction. |
| **Голосовой ввод еды** | Cal AI voice logging. | Отдельный input modality, speech API, i18n. | Photo-only для MVP. |
| **Auth + синхронизация между устройствами** | «Хочу с телефона и ноутбука». | Требует OAuth, backend DB, conflict resolution. Явно out of scope PROJECT.md. | localStorage, один браузер. |
| **Персональные цели (BMR, weight, macro targets)** | MFP/Cal AI onboarding с профилем. | Нужен onboarding, формулы, хранение профиля. Сейчас hardcoded 2000 kcal. | Hardcoded goal для MVP; настраиваемые цели — v1.x после валидации core loop. |
| **Категории приёмов** (завтрак/обед/ужин) | Стандарт macro trackers. | UI complexity (tabs, filters); не критично для photo-first demo. | Timestamp-only grouping (уже есть). |
| **AI-коуч / meal plans / чат** | Trend 2025–2026 (LLM nutrition coach). | Отдельный продукт; guardrails, disclaimers, HIPAA-риски. | Фокус на logging, не coaching. |
| **Трекинг воды, веса, упражнений** | MFP all-in-one. | Размывает core value; каждый — отдельный модуль. | Только еда. |
| **Микронутриенты (витамины, 100+ nutrients)** | SnapCalorie premium depth. | Vision не может надёжно оценить микронутриенты без RAG. | Калории + 4 макро + fiber. |
| **Обучение модели на коррекциях пользователя** | Cal AI «learns from corrections». | Нужен feedback loop, storage, fine-tuning infra. | Локальный edit без ML feedback loop. |
| **Capacitor / native shell** | Design spec упоминал. | Отвлекает от AI integration; web достаточен для MVP. | Responsive web. |
| **Premium / paywall** | Монетизация. | MFP Meal Scan — premium only; для demo MVP барьер убивает adoption. | Бесплатный demo. |

## How Real AI Food Photo Features Work

Типичный pipeline в Cal AI, MFP Meal Scan, SnapCalorie и research frameworks (DietAI24):

```
Photo upload → Vision model identifies food → Portion estimation → Nutrition calculation → User review/edit → Save to diary → Daily aggregation
```

**При замене mock на OpenAI Vision (ожидаемое поведение):**

| Этап | Mock сейчас | Real Vision |
|------|-------------|-------------|
| Input | Multipart upload, image ignored | Resize/compress на backend; base64 или URL в Vision API |
| Processing | Random delay 1.5–3 s, hardcoded response | 3–10 s API call; structured JSON (`json_schema` → `NutritionResult`) |
| Identification | «Grilled Chicken Salad» всегда | Зависит от фото: может ошибиться в культурных/сложных блюдах |
| Portion | Фиксированная | Visual estimation — главный источник ошибок; нужен user edit |
| Nutrition values | Константа | Из parametric knowledge модели (без RAG — менее надёжно); prompt engineering критичен |
| Confidence | Mock 0.92 | Модель должна явно возвращать; низкий confidence → подсказка «проверьте» |
| Errors | Нет | Timeout, 429, non-food image, unreadable — structured `ApiError` |
| Security | Open CORS | API key только на backend; rate limit per IP/session |

**OpenAI implementation pattern (HIGH confidence, official docs):**
- Vision через Chat Completions / Responses API с `input_image`
- Structured output через `response_format: { type: "json_schema", ... }` — маппинг на `NutritionResult`
- Backend Express: multer → resize → OpenAI call → validate → return `AnalyzeFoodResponse`

## Feature Dependencies

```
Photo Upload (add-food)
    └──requires──> Image Preview (useImageStore)
                       └──requires──> AI Analysis (analyze-food / Vision API)
                                          └──requires──> Backend Proxy (API key security)
                                                             └──requires──> Structured Output Schema (NutritionResult)

AI Analysis
    └──requires──> Loading State UI
    └──requires──> Error Handling (retry + toast)
    └──produces──> NutritionResult

NutritionResult Display
    └──requires──> AI Analysis
    └──enhanced by──> Edit Before Save (коррекция порции/макросов)

Edit Before Save
    └──requires──> NutritionResult Display
    └──blocks trust without──> Real Vision (mock не нуждается в edit)

Save to Diary (save-meal)
    └──requires──> NutritionResult (confirmed/edited)
    └──requires──> Diary Store (useDiaryStore)

Diary Persistence (localStorage)
    └──requires──> Save to Diary
    └──enables──> Daily Summary + History View

Daily Summary (DailyHeader)
    └──requires──> Diary Persistence
    └──enhanced by──> Calorie Goal (hardcoded MVP / configurable v1.x)

History View (DiaryPage)
    └──requires──> Diary Persistence

Confidence Badge
    └──requires──> AI Analysis returning confidence field
```

### Dependency Notes

- **AI Analysis requires Backend Proxy:** API key нельзя на клиенте (constraint PROJECT.md). Vision call только из `apps/backend`.
- **Edit Before Save requires Real Vision:** С mock edit опционален; с реальным AI — table stakes, иначе пользователи сохраняют галлюцинации.
- **Diary Persistence enables Daily Summary:** Без persist home screen пустой после refresh — пользователь уходит.
- **Structured Output Schema blocks reliable UI:** Без `json_schema` парсинг free-text от Vision хрупкий; shared-types уже определяют контракт.
- **RAG conflicts with MVP timeline:** Улучшает accuracy, но не required для first showable MVP; Vision-only достаточен с edit flow.

## MVP Definition

### Launch With (v1) — web-MVP с OpenAI Vision

Минимум для валидации core value: «сфотографировал → получил КБЖУ → сохранил → вижу в дневнике».

- [x] Photo upload (file picker) — existing
- [ ] Real OpenAI Vision analysis via backend proxy — **essential, replaces mock**
- [x] Loading state during analysis — existing
- [x] Nutrition breakdown display (cal, P/C/F, fiber, confidence) — existing
- [ ] **Edit/adjust before save** (portion scale or inline values) — **essential with real AI**
- [x] Confirm + save to diary — existing
- [x] Daily calorie summary on Home — existing (hardcoded 2000 goal OK for MVP)
- [x] Meal history grouped by date — existing
- [x] localStorage persistence — existing (verify E2E)
- [ ] Structured error feedback (toast + inline) — **essential for showable MVP**

### Add After Validation (v1.x)

Триггер: пользователи прошли happy path, но запрашивают больше.

- [ ] Настраиваемая дневная цель калорий — trigger: «2000 не моя норма»
- [ ] Удаление / редактирование записей в дневнике — trigger: «ошибся вчера»
- [ ] Multi-item detection (несколько блюд на тарелке) — trigger: «AI видит только одно»
- [ ] Retry analysis без re-upload — trigger: частые transient errors
- [ ] Image compression before upload — trigger: slow analysis / mobile data concerns
- [ ] Daily macro summary (не только калории) — trigger: fitness users

### Future Consideration (v2+)

- [ ] Google OAuth + server diary — требует auth phase
- [ ] RAG + USDA/FNDDS grounding — accuracy at scale
- [ ] Barcode scanning — native app phase
- [ ] Voice logging — secondary input modality
- [ ] AI coach / meal recommendations — отдельный продуктовый track
- [ ] Capacitor native shell — после web PMF
- [ ] Food database search fallback — если photo-only insufficient

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Real Vision analysis (backend) | HIGH | MEDIUM | P1 |
| Edit before save | HIGH | MEDIUM | P1 |
| Error handling + toast | HIGH | LOW | P1 |
| localStorage persistence (verify) | HIGH | LOW | P1 |
| Photo upload + preview | HIGH | LOW (done) | P1 |
| Nutrition display + confidence | HIGH | LOW (done) | P1 |
| Save to diary + daily summary | HIGH | LOW (done) | P1 |
| Meal history view | MEDIUM | LOW (done) | P1 |
| Configurable calorie goal | MEDIUM | LOW | P2 |
| Delete/edit diary entries | MEDIUM | LOW | P2 |
| Multi-item plate detection | MEDIUM | HIGH | P2 |
| Image resize on backend | MEDIUM | LOW | P2 |
| Daily macro totals (not just cal) | MEDIUM | LOW | P2 |
| RAG nutrition grounding | HIGH (accuracy) | HIGH | P3 |
| Auth + cloud sync | MEDIUM | HIGH | P3 |
| Barcode / voice input | LOW (MVP) | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | MyFitnessPal | Cal AI | SnapCalorie | AI Food (web-MVP plan) |
|---------|--------------|--------|-------------|------------------------|
| Photo meal scan | Premium; suggestions from 20M DB | Core flow; 2–3 s | Core + LiDAR volume | Core flow; Vision API |
| Database search | 20M foods, primary method | Secondary / post-acquisition MFP DB | USDA-backed, no search UX | **Skip** — photo-first |
| Edit before save | Serving size per item | Portion slider, ½×–2×, swap items | Manual adjust | **Add** — scale/edit (P1) |
| Daily calorie ring | Yes + goals from profile | Yes + widgets | Yes + 100+ nutrients | Yes, hardcoded 2000 (MVP) |
| Meal history | Full diary + meal slots | Visual timeline | Photo timeline | By date, timestamp |
| Auth / sync | Required | Account + HealthKit | Account | **Defer** — localStorage |
| Confidence / accuracy transparency | DB «verified» foods | Implied speed > accuracy | Research-backed claims | Confidence badge + honest copy |
| Platform | Native iOS/Android | Native | Native iOS | **Web-first** (differentiator for demo) |
| Price | Freemium, scan = premium | Free tier + $9.99/mo | Free | Free demo |

**Позиционирование AI Food для MVP:** Cal AI speed + web accessibility, без database complexity MFP. Ключевой gap vs конкурентами — edit-before-save при переходе на реальный Vision.

## Sources

- [MyFitnessPal Meal Scan FAQ](https://support.myfitnesspal.com/hc/en-us/articles/360045761612-Meal-Scan-FAQ) — HIGH: photo → suggestions → serving edit → diary flow
- [TechCrunch: MFP acquires Cal AI](https://techcrunch.com/2026/03/02/myfitnesspal-has-acquired-cal-ai-the-viral-calorie-app-built-by-teens/) — HIGH: speed vs accuracy positioning
- [Cal AI official site](https://www.calai.app/) — MEDIUM: photo-first, depth sensor, integrations
- [SnapCalorie App Store](https://apps.apple.com/us/app/snapcalorie-ai-calorie-counter/id1574239307) — MEDIUM: LiDAR, USDA, photo+voice
- [Aumiqx Cal AI Review 2026](https://aumiqx.com/ai-tools/cal-ai-app-review-nutrition-tracker-2026/) — MEDIUM: edit flow, accuracy expectations
- [DietAI24, Nature Communications Medicine 2025](https://www.nature.com/articles/s43856-025-01159-0) — HIGH: Vision hallucinates nutrition; RAG recommended for accuracy
- [OpenAI API — Vision / Images guide](https://developers.openai.com/api/docs/guides/images) — HIGH: image input patterns
- [OpenAI API — Structured outputs](https://developers.openai.com/api/docs/guides/responses-vs-chat-completions) — HIGH: `json_schema` for `NutritionResult`
- [SpeedMVPs AI Nutrition App 2026](https://speedmvps.com/blog/ai-nutrition-app-development) — MEDIUM: MVP layers (capture → data → personalize)
- [Precode: Nutrition app in 1 week](https://www.precode.co/insights/how-we-built-a-nutrition-tracking-app-in-1-week-and-why-fitness-businesses-dont-need-3-month-development-timelines) — MEDIUM: MVP feature phasing
- `.planning/PROJECT.md`, `.planning/codebase/ARCHITECTURE.md` — HIGH: current state, constraints, gaps
- `docs/superpowers/specs/2026-06-24-ai-food-mvp-design.md` — HIGH: approved MVP scope

---
*Feature research for: AI Food web-MVP (OpenAI Vision + localStorage diary)*
*Researched: 2026-06-24*
