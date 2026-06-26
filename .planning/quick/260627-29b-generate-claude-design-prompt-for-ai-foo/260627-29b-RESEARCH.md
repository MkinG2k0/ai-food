# Research: Generate Claude Design Prompt for AI Food App

**Date:** 2026-06-27
**Task:** Understand existing app well enough to write a high-quality Claude Design prompt

---

## App Overview (what exists today)

AI Food is a mobile-first web SPA for calorie tracking. The core loop:

1. User opens the app — sees today's calorie count and a list of logged meals
2. Taps the floating "+" button — goes to Add Food screen
3. Picks a photo from gallery or takes one with camera
4. App sends photo to backend (OpenAI Vision) — Result screen shows AI-parsed nutrition
5. User saves the meal — it appears in the diary, persisted to localStorage

Stack: React 18 + Vite, Tailwind CSS, shadcn/ui components, Zustand, TanStack Query. No auth, no database — single user, localStorage persistence.

---

## Key Screens & UX Flow

### Screen 1 — Home (/)
- Large emerald green header: shows "Today", calorie count (bold, 4xl), "X kcal remaining", and a thin progress bar (white on emerald-400)
- Daily calorie goal: 2000 kcal hardcoded
- Main content: list of MealCard items (card per logged meal)
- Fixed FAB (floating action button): bottom-right, circular, emerald, "+" icon, navigates to /add
- Empty state: MealList presumably shows something when no meals logged

### Screen 2 — Add Food (/add)
- Header bar with back arrow + "Add Food" title
- Center-aligned ImagePicker component
- Two hidden file inputs: one for camera (`capture="environment"`), one for gallery (no capture)
- ImagePicker shows: photo preview once selected, two buttons (Camera / Gallery) before selection, confirmation once image picked
- On image select: immediately navigates to /result

### Screen 3 — Result (/result)
- Shows AI-parsed nutrition for the photographed food
- Contains: photo preview of the selected image, food item names, nutrition breakdown (calories, protein, fat, carbs)
- Has skeleton loading states while API call is in flight
- Has error state with retry option
- "Save to Diary" button — saves meal and navigates to /
- Back navigation guard: redirects to /add if no image in store

### Screen 4 — Diary (/diary)
- Header bar with back arrow + "Food Diary" title
- Meals grouped by date (date label as section header, muted text)
- MealCard per meal: emerald circle icon (Utensils), food name(s), time, calorie count in emerald
- Empty state: centered message + "Add Food" button

---

## Visual Style & Design Tokens

**Primary color:** Emerald green
- `bg-emerald-500` — hero header background
- `text-emerald-100` — secondary text on green
- `bg-emerald-100` / `text-emerald-600` — icon backgrounds and accents
- `text-emerald-600` — calorie numbers in cards
- `bg-emerald-400` — progress bar track

**Theme:** shadcn/ui semantic tokens (light/dark aware)
- `bg-background` — page background
- `text-foreground` — primary text
- `text-muted-foreground` — secondary/subdued text
- `border` — dividers
- `bg-card` — card backgrounds

**Global CSS observation:** shadcn/ui theme with emerald as primary, mobile-optimized body styles [VERIFIED: observation #402]

**Typography:**
- Page title: `text-lg font-semibold`
- Hero calories: `text-4xl font-bold`
- Card labels: `text-sm font-medium`
- Metadata (time, date): `text-xs text-muted-foreground`
- Section headers: `text-sm font-medium text-muted-foreground`

**Spacing:** `px-4` body padding, `py-4` section padding, `pb-24` bottom padding on home to clear FAB

**Shadows:** FAB has `shadow-lg`

**Radii:** FAB is `rounded-full`, cards use default shadcn radius, icon avatar is `rounded-full`

**Icons:** Lucide React — `Plus`, `ArrowLeft`, `Utensils`

**Overall aesthetic:** Clean, minimal, health/food app feel. Emerald green as brand color evokes freshness and health. Cards on white/light background. No heavy decorative elements.

---

## Component Inventory

| Component | Location | Description |
|-----------|----------|-------------|
| `Button` | shared/ui | shadcn/ui — variants: default (filled emerald), ghost, icon sizes |
| `Card` / `CardContent` | shared/ui | shadcn/ui card with padding |
| `Badge` | shared/ui | shadcn/ui badge |
| `Skeleton` | shared/ui | Loading placeholder |
| `DailyHeader` | widgets/daily-header | Emerald hero header with calorie progress |
| `MealList` | widgets/meal-list | List of MealCards for today |
| `NutritionCard` | widgets/nutrition-card | Nutrition breakdown display (used on Result page) |
| `MealCard` | entities/meal/ui | Single meal row: icon + name + time + kcal |
| `NutritionRow` | entities/nutrition/ui | Single macro row (label + value) |
| `ImagePicker` | features/add-food/ui | Photo picker with camera/gallery dual-input |

Key patterns for Claude Design to show:
- **Skeleton loading** on Result screen while API fetches
- **Progress bar** in header (thin, white on green)
- **FAB** (circular floating button, bottom-right)
- **Empty state** (centered icon + text + CTA button)
- **Grouped list** with date section headers

---

## Claude Design Prompt Strategy

### What Claude Design needs to produce great mockups

1. **App identity** — name, one-sentence purpose, target user
2. **Platform** — mobile web (375px width reference), not native app
3. **Design language** — minimal, clean, health/wellness aesthetic; shadcn/ui component system; emerald green brand color
4. **All 4 screens** with specific content to fill each (not lorem ipsum)
5. **Exact component details** — what goes in each card, header, state
6. **States to show** — loading skeleton on Result, empty state on Diary, over-goal color change on progress
7. **Color spec** — emerald-500 primary, semantic background/card tokens (white in light mode)
8. **Typography hierarchy** — 4xl hero number, lg section title, sm card text, xs metadata

### What to emphasize
- The emerald hero header is the visual anchor — it should be bold and feel premium
- The FAB is essential to the home screen feel — must be visible and prominent
- Photo preview on Result screen is important — the food photo should be large
- Nutrition breakdown should use a card-based layout with macro rows
- Skeleton states should be shown on Result as an alternate state
- The app should feel like a polished consumer health app (think Lose It! or MyFitnessPal but minimal)

### What NOT to request
- No navigation tabs/bottom bar (current app uses page-by-page navigation with back buttons)
- No auth screens
- No complex charts or graphs (just the simple progress bar)
- No dark mode mockup (light mode is sufficient for MVP)

### Recommended prompt structure
1. Short app description + value prop
2. Design system: "mobile-first web app, 375px, Tailwind + shadcn/ui, emerald green (#10b981) as primary"
3. Screen-by-screen breakdown with content specifics
4. Visual style keywords
5. States to include per screen
