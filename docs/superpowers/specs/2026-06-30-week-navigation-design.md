# Week Navigation Design

**Date:** 2026-06-30  
**Feature:** Day-switching with weekly strip and swipe navigation  
**Status:** Approved

## Problem

The home screen currently shows only today's data. Users cannot view meals from previous days without going to the separate Diary page. The goal is to add an inline week strip in the header that lets users tap a day to see that day's calories and meals, and swipe left/right to move between weeks.

## Requirements

- Display the current week (Mon–Sun) as a horizontal strip inside `DailyHeader`
- Weeks start on Monday
- Tapping a day selects it — `DailyHeader` and `MealList` update to show that day's data
- Swiping the strip left/right navigates to adjacent weeks (3-week windowed rendering)
- Selecting a day always defaults to today on app open (no persistence)
- If swiping to a different week where the previously selected day doesn't exist in view, default to Monday of the new week
- **Library:** `framer-motion` for drag gesture and animation

## State

Lives in `HomePage` as local React state (not persisted):

```ts
const [weekOffset, setWeekOffset] = useState(0); // 0 = current week
const [selectedDate, setSelectedDate] = useState(new Date()); // today
```

`weekOffset` is an integer: 0 = current week, -1 = last week, +1 = next week, etc.

When `weekOffset` changes, if `selectedDate` is not in the new week → reset `selectedDate` to Monday of the new week.

## Architecture

### New file: `shared/lib/dateUtils.ts`

Pure date helpers (no side effects, easy to unit-test):

```ts
getWeekStart(date: Date): Date         // Monday of the week containing date
getWeekDays(weekOffset: number): Date[] // 7 Date objects Mon–Sun for the given offset
isSameDay(a: Date, b: Date): boolean
formatDayLabel(date: Date): string      // "Пн", "Вт", etc. (ru locale short)
formatHeaderDate(date: Date): string    // "Today" if today, else "Пн, 23 июн"
```

### New component: `widgets/daily-header/ui/WeekStrip.tsx`

Props:
```ts
interface WeekStripProps {
  weekOffset: number;
  selectedDate: Date;
  meals: Meal[];                        // to show dot indicators
  onDaySelect: (date: Date) => void;
  onWeekChange: (delta: 1 | -1) => void;
}
```

Renders three week rows side by side (`prev | current | next`) in a `motion.div` with `drag="x"`.  
`dragConstraints={{ left: 0, right: 0 }}` — snap back unless threshold exceeded.  
`onDragEnd`: if `|offsetX| > 80px` OR `velocity.x > 500` → call `onWeekChange(±1)`.  
`animate={{ x: 0 }}` with spring transition after snap.

Each day is a `<button>`:
- Abbreviated day name (Пн/Вт/Ср/Чт/Пт/Сб/Вс)
- Day number
- Active state: white circle bg + emerald text (when `isSameDay(day, selectedDate)`)
- Dot indicator below number if `meals.some(m => isSameDay(new Date(m.timestamp), day))`
- Today highlight: bold number if `isSameDay(day, new Date())`

### Updated: `widgets/daily-header/ui/DailyHeader.tsx`

Accepts props instead of reading `new Date()` internally:

```ts
interface DailyHeaderProps {
  selectedDate: Date;
  weekOffset: number;
  onDaySelect: (date: Date) => void;
  onWeekChange: (delta: 1 | -1) => void;
}
```

Renders `<WeekStrip>` below the calories summary. Header label changes from hardcoded "Today" to `formatHeaderDate(selectedDate)`.

### Updated: `widgets/meal-list/ui/MealList.tsx`

Accepts `selectedDate: Date` prop. Replaces `new Date().toDateString()` filter with `isSameDay(new Date(m.timestamp), selectedDate)`. Empty state message changes to "No meals on this day" when selected day ≠ today.

### Updated: `pages/home/ui/HomePage.tsx`

Owns `weekOffset` and `selectedDate` state. Passes them down to `DailyHeader` and `selectedDate` to `MealList`.

### Updated barrels

- `widgets/daily-header/index.ts` — no new public export needed (WeekStrip is internal to widget)
- `widgets/meal-list/index.ts` — `MealList` prop signature changes (non-breaking at call site since HomePage passes the prop)

## Data Flow

```
HomePage (state: weekOffset, selectedDate)
  ├── DailyHeader (selectedDate, weekOffset, onDaySelect, onWeekChange)
  │     └── WeekStrip (framer-motion drag → onWeekChange / onDaySelect)
  └── MealList (selectedDate)
        └── useDiaryStore (reads all meals, filters by selectedDate)
```

`useDiaryStore` is unchanged — still holds all meals. Filtering is done at render time.

## Visual Layout (WeekStrip)

```
[←]  Пн  Вт  Ср  Чт  Пт  Сб  Вс  [→]
      23  24  25  26  27  28  29
      ●               ●
```
No explicit arrow buttons — navigation is swipe-only. The `[←]` / `[→]` indicators above are just to illustrate direction; they are not rendered.

## Dependencies

Add to `apps/mobile/package.json`:
```
"framer-motion": "^11.0.0"
```

## Files Changed

| File | Change |
|------|--------|
| `shared/lib/dateUtils.ts` | new — date helpers |
| `shared/lib/index.ts` | export dateUtils helpers |
| `widgets/daily-header/ui/WeekStrip.tsx` | new — swipeable week strip |
| `widgets/daily-header/ui/DailyHeader.tsx` | accept props, embed WeekStrip |
| `widgets/daily-header/index.ts` | no change to public API |
| `widgets/meal-list/ui/MealList.tsx` | accept selectedDate prop |
| `pages/home/ui/HomePage.tsx` | own state, wire props |
| `apps/mobile/package.json` | add framer-motion |

## Out of Scope

- Persistence of selected day across app restarts
- Swiping the meal list itself (only the week strip swipes)
- Editing or deleting meals from the day view
- Navigation arrow buttons (swipe only)
