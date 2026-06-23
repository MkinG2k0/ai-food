# AI Food MVP — Design Spec
**Date:** 2026-06-24  
**Status:** Approved

---

## Goal

Mobile-first AI nutrition tracking app. User photographs food, receives mocked nutrition data, confirms and saves to a local diary. No real AI, no auth, no backend DB — pure frontend MVP with a mocked Express server.

---

## Monorepo Layout

```
ai-food/
├── apps/
│   ├── mobile/          # React + TypeScript + Capacitor
│   └── backend/         # Express mock server
├── packages/
│   └── shared-types/    # Shared TypeScript types
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

**Toolchain:** Turborepo + pnpm workspaces.

---

## Frontend Architecture (Feature-Sliced Design)

```
apps/mobile/src/
├── app/                  # Global providers, router, store init, global CSS
├── pages/                # Route-level components (thin shells)
│   ├── home/
│   ├── add-food/
│   ├── result/
│   └── diary/
├── widgets/              # Composed UI blocks
│   ├── daily-header/     # Calories summary
│   ├── meal-list/        # Diary entry list
│   └── nutrition-card/   # Nutrition breakdown display
├── features/
│   ├── add-food/         # Camera/file picker + Zustand image state
│   ├── analyze-food/     # useAnalyzeFood TanStack Query hook
│   └── save-meal/        # Save confirmed meal to diary store
├── entities/
│   ├── meal/             # Meal model + display component
│   └── nutrition/        # NutritionResult display component
└── shared/
    ├── api/              # Axios client (baseURL, interceptors)
    ├── ui/               # shadcn/ui re-exports
    └── lib/              # Date helpers, number formatters
```

### Layer import rules (FSD)
- Higher layers may import from lower layers only.
- Order (high → low): `app → pages → widgets → features → entities → shared`
- No cross-imports within the same layer.

---

## State Management

### Zustand (client / UI state only)
| Store | State |
|---|---|
| `useImageStore` | `selectedImage: File \| null`, `previewUrl: string \| null`, `clear()` |
| `useDiaryStore` | `meals: Meal[]`, `addMeal(meal)`, `clearDiary()` |

**Rule:** Zustand never holds server data (API responses).

### TanStack Query (server state)
| Hook | Details |
|---|---|
| `useAnalyzeFood(imageFile)` | POST `/analyze-food`, enabled when `imageFile != null`, staleTime 30s, retry 2 |
| `useDiary()` | Returns `useDiaryStore` meals (stub for future backend) |

**Rule:** All API calls go through TanStack Query hooks. No direct `axios` calls in components.

---

## API Layer

`shared/api/client.ts` — single Axios instance:
- `baseURL`: `http://localhost:3001` (dev) / env var in prod
- Request interceptor: attach `Content-Type: multipart/form-data` for file uploads
- Response interceptor: normalize errors → `ApiError` shape

---

## Pages & Routing (React Router v6)

| Route | Page | Description |
|---|---|---|
| `/` | `HomePage` | Daily calories + meal list + add button |
| `/add` | `AddFoodPage` | Camera or file picker |
| `/result` | `ResultPage` | Nutrition breakdown + confirm |
| `/diary` | `DiaryPage` | Full meal history |

Navigation flow: `Home → /add → /result → /` (back to home after confirm).

---

## Features

### `add-food`
- File input (accepts `image/*`)
- Optional camera button (Capacitor Camera API, graceful fallback on web)
- On select: store file in `useImageStore`, navigate to `/result`

### `analyze-food`
- `useAnalyzeFood(imageFile: File | null)` hook
- Builds `FormData`, POSTs to `/analyze-food` via Axios client
- Returns `{ data, isLoading, isError }` from TanStack Query

### `save-meal`
- `useSaveMeal()` — reads current `NutritionResult`, pushes `Meal` into `useDiaryStore`
- After save: clears image store, navigates to `/`

---

## Shared Types (`packages/shared-types/src/index.ts`)

```ts
FoodItem       { id, name, calories, protein, carbs, fat, portion }
Meal           { id, timestamp, items: FoodItem[], totalCalories }
NutritionResult { foodName, calories, protein, carbs, fat, fiber, confidence }
AnalyzeFoodRequest  { image: File }
AnalyzeFoodResponse { result: NutritionResult, processingTime: number }
ApiError       { message, code, status }
```

---

## Backend (`apps/backend/`)

Single Express server, port 3001.

`POST /analyze-food`
- Accepts `multipart/form-data` (ignores image content)
- Waits 1.5–3 seconds (random)
- Returns hardcoded `AnalyzeFoodResponse`
- CORS open for `localhost`

No database. No auth. No other routes.

---

## UI System

- **TailwindCSS** — all styling, mobile-first, no inline styles, no CSS modules
- **shadcn/ui** — Button, Card, Dialog, Toast (Sonner), Tabs, Input, Badge, Skeleton
- **Design tokens** — neutral base, green accent (`emerald-500`) for health theme
- **Layout** — max-w-md centered, bottom nav bar, safe-area padding for mobile

---

## Non-Goals

- Real AI / image recognition
- Authentication / user accounts
- Payments
- Backend persistence (DB)
- NestJS / Redux

---

## Run Instructions

```bash
pnpm install
pnpm dev          # starts both mobile (Vite :5173) and backend (:3001)
```
