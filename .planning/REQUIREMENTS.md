# Requirements: AI Food

**Defined:** 2026-06-24
**Core Value:** Сфотографировал еду → получил правдоподобные данные о питании → сохранил в дневник — без лишних шагов и без потери данных при перезагрузке.

## v1 Requirements

### Photo Capture

- [ ] **PHOTO-01**: User can select a food photo via file picker (`image/*`)
- [ ] **PHOTO-02**: User sees a preview of the selected photo on the result screen before saving

### AI Analysis

- [ ] **AI-01**: User receives real nutrition analysis from OpenAI Vision via backend proxy (API key never exposed to client)
- [ ] **AI-02**: Backend returns structured `NutritionResult` (foodName, calories, protein, carbs, fat, fiber, confidence) matching shared-types contract
- [ ] **AI-03**: User sees a loading state while analysis is in progress (skeleton/spinner, no frozen UI)

### Result & Confirmation UX

- [ ] **UX-01**: User sees nutrition breakdown (calories, protein, carbs, fat, fiber) after analysis completes
- [ ] **UX-02**: User sees AI confidence indicator with honest «estimate» messaging (not clinical accuracy claims)
- [ ] **UX-03**: User can adjust portion or macro values before saving (scale multiplier 0.5×–2× and/or inline edit)
- [ ] **UX-04**: User can retake/replace photo from the result screen without losing navigation context
- [ ] **UX-05**: User confirms save explicitly (no auto-save to diary)

### Diary

- [ ] **DIARY-01**: User can save a confirmed meal to the diary with timestamp
- [ ] **DIARY-02**: User sees today's calorie summary on the home screen
- [ ] **DIARY-03**: User sees meal history grouped by date on the diary page
- [ ] **DIARY-04**: Diary data persists across browser refresh (localStorage)
- [ ] **DIARY-05**: User can delete or edit existing diary entries

### Error Handling

- [ ] **ERR-01**: User sees a clear inline error when analysis fails (with option to retake)
- [ ] **ERR-02**: User receives toast feedback on save success and analysis/save failures
- [ ] **ERR-03**: Backend returns typed `ApiError` for common failure modes (timeout, rate limit, invalid image, service error)

### Navigation

- [ ] **NAV-01**: User can complete the happy path Home → Add → Result → Home without dead ends

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### AI & Performance

- **AI-04**: Client-side image resize/compression before upload (cost and latency control)
- **AI-05**: Zod runtime validation of AI JSON on backend
- **AI-06**: Backend image resize via sharp before OpenAI call
- **AI-07**: Retry analysis without re-uploading photo

### Diary & Goals

- **DIARY-06**: User can set a custom daily calorie goal (replace hardcoded 2000)
- **DIARY-07**: User sees daily macro totals (protein/carbs/fat), not only calories

### Auth & Sync

- **AUTH-01**: User can sign in with Google OAuth
- **AUTH-02**: User diary syncs across devices via backend

### Accuracy

- **AI-08**: RAG grounding with USDA/FNDDS nutrition database
- **AI-09**: Multi-item decomposition for composite plates

### Platform

- **PLAT-01**: Capacitor native shell with camera API
- **PLAT-02**: Barcode scanning for packaged foods

## Out of Scope

| Feature | Reason |
|---------|--------|
| Food database search (MFP-style 20M items) | Conflicts with photo-first value; months of work |
| Payments / premium paywall | Demo MVP should be frictionless |
| Backend database persistence | localStorage sufficient for web-MVP |
| AI coach / meal plans / chat | Separate product track; scope creep |
| Water, weight, exercise tracking | Dilutes core food logging value |
| Micronutrients beyond fiber | Vision cannot reliably estimate; needs RAG |
| Voice logging | Separate input modality |
| LiDAR / depth-based portion sizing | Not available on web |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PHOTO-01 | Phase 2 | Pending |
| PHOTO-02 | Phase 2 | Pending |
| AI-01 | Phase 1 | Pending |
| AI-02 | Phase 1 | Pending |
| AI-03 | Phase 2 | Pending |
| UX-01 | Phase 3 | Pending |
| UX-02 | Phase 3 | Pending |
| UX-03 | Phase 3 | Pending |
| UX-04 | Phase 3 | Pending |
| UX-05 | Phase 3 | Pending |
| DIARY-01 | Phase 4 | Pending |
| DIARY-02 | Phase 4 | Pending |
| DIARY-03 | Phase 4 | Pending |
| DIARY-04 | Phase 4 | Pending |
| DIARY-05 | Phase 4 | Pending |
| ERR-01 | Phase 5 | Pending |
| ERR-02 | Phase 5 | Pending |
| ERR-03 | Phase 1 | Pending |
| NAV-01 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 19 total
- Mapped to phases: 19/19 ✓
- Unmapped: 0

---
*Requirements defined: 2026-06-24*
*Last updated: 2026-06-24 after roadmap creation*
