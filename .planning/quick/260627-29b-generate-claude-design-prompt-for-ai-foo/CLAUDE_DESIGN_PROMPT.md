> Скопируй всё ниже и вставь в claude.ai/design

---

# AI Food App — UI Mockups

Design high-fidelity mobile web mockups for **AI Food**, a calorie tracking app where users photograph their food and get instant AI-powered nutrition estimates.

**Target user:** Health-conscious adults who want fast, low-friction calorie logging.
**Platform:** Mobile web app (375px wide reference). Not a native app — runs in a mobile browser.
**Design system:** Tailwind CSS + shadcn/ui component library. Clean, minimal, consumer-grade health app aesthetic. Think Lose It! or MyFitnessPal but stripped-down and modern.

---

## Color & Typography System

**Primary brand color:** Emerald green — `#10b981` (Tailwind `emerald-500`)
- Hero header background: emerald-500
- Accent text on green: emerald-100 (soft white-green)
- Progress bar track: emerald-400 (lighter green on green)
- Calorie numbers in cards: emerald-600
- Icon avatar backgrounds: emerald-100 with emerald-600 icon

**Neutral tokens (shadcn/ui semantic):**
- Page background: white / off-white
- Card background: white with subtle border
- Primary text: near-black
- Secondary text: muted gray (`text-muted-foreground`)
- Dividers: light gray border

**Typography hierarchy:**
- Hero calorie count: 36–40px, bold, white
- Page title in header bar: 18px, semibold
- Card food name: 14px, medium weight
- Metadata (time, date labels): 12px, muted gray
- Section headers (date groups): 12–13px, medium, muted gray, uppercase or capitalized

**Spacing:** 16px horizontal body padding. 16px vertical section padding. 24px+ bottom padding on home screen to avoid the floating button.

---

## Screen 1 — Home Screen (`/`)

**Full screen layout, top to bottom:**

**Top: Emerald hero header (approximately 160–180px tall)**
- Background: solid emerald-500
- "Today" label: small, emerald-100, top-left area
- Calorie count: "1 450" in giant bold white text (4xl / ~40px)
- Subtitle: "550 kcal remaining" in emerald-100, smaller
- Daily goal context: "of 2 000 kcal goal" in tiny emerald-100
- Progress bar: thin horizontal bar (8px height), full width, white/semi-transparent background, emerald-400 fill at ~72% width

**Body: Meal list**
- Section label: "Today's Meals" in small muted uppercase text
- Three MealCard rows, each in a white card with shadow:
  - Card 1: Emerald circle avatar with fork icon (Utensils) | "Овсянка с ягодами" | "08:30" in muted | "320 kcal" in emerald-600 right-aligned
  - Card 2: Same avatar style | "Куриный салат" | "13:15" | "480 kcal"
  - Card 3: Same avatar style | "Банан" | "16:00" | "90 kcal"
- Cards have 12px rounded corners, white background, light border

**Bottom: Floating Action Button (FAB)**
- Position: fixed bottom-right, 24px from edges
- Shape: circle, 56px diameter
- Color: emerald-500 background, white "+" icon
- Shadow: prominent drop shadow
- This is the primary CTA — make it visually dominant

---

## Screen 2 — Add Food (`/add`)

**Two states to show (show as side-by-side or labeled alternates):**

**State A — Before image selection:**
- Top bar: white background, back arrow left, "Add Food" centered title (18px semibold)
- Body: vertically centered in remaining space
- Large placeholder rectangle (16:9 or square, rounded, gray border dashed or light gray fill)
- Two buttons side-by-side below the placeholder:
  - Left: ghost/outline button with camera icon — "Camera"
  - Right: ghost/outline button with image/gallery icon — "Gallery"
- Instructional text above or below: "Take a photo of your food" in muted gray

**State B — After image selected (photo preview):**
- Top bar: same as State A
- Body: food photo fills the placeholder area (show a photo of pasta or a meal)
- Below photo: a filled emerald button "Analyze Food →" or the app auto-navigates (indicate it's processing)

---

## Screen 3 — Result (`/result`)

**Two states to show:**

**State A — Loaded (AI result received):**
- Top bar: back arrow, "Nutrition Info" title
- Large food photo preview (full width, ~200px tall, object-cover, rounded bottom corners or slight inset)
- Below photo: NutritionCard component
  - Card header: "Pasta Carbonara" (detected food name), semibold, 16px
  - Nutrition rows (label left, value right):
    - Calories: **650 kcal** (larger, emerald-600)
    - Protein: 24 g
    - Fat: 28 g
    - Carbs: 72 g
  - Each row: subtle divider between rows
- Bottom: full-width emerald button "Save to Diary" with checkmark icon

**State B — Loading (skeleton state, show as small alternate):**
- Same top bar
- Photo area replaced with: gray skeleton rectangle (shimmer/pulse animation)
- NutritionCard replaced with:
  - Skeleton line (wide, ~60%) for food name
  - 4 skeleton rows (narrow value lines) for nutrition
- "Save to Diary" button: grayed out / disabled

---

## Screen 4 — Diary (`/diary`)

**Two states to show:**

**State A — Meals logged:**
- Top bar: back arrow, "Food Diary" title
- Meals grouped by date with section headers:
  - Section header: "Today" or "Jun 26" in small muted uppercase, with a light divider below
  - MealCard rows (same design as Home screen): icon avatar, food name, time, kcal
  - Example meals: "Паста карбонара — 19:30 — 650 kcal", "Овсянка — 08:30 — 320 kcal"
  - Section header: "Yesterday" or "Jun 25"
  - MealCard rows: "Куриный суп — 13:00 — 410 kcal", "Тост с авокадо — 09:00 — 260 kcal"
- Date sections have 16px gap between them

**State B — Empty state:**
- Top bar: same
- Centered vertically in body:
  - Icon: large muted gray plate or fork illustration / lucide icon
  - Heading: "No meals logged yet" (16px, medium)
  - Subtitle: "Start by photographing your food" (muted, 14px)
  - Emerald button: "Add Food" centered below text

---

## Visual & Style Notes

- **Aesthetic:** Clean white backgrounds, generous whitespace, no heavy decorations. Cards have very subtle shadows. The emerald header is the only bold color block — everything else is neutral.
- **No bottom navigation bar.** The app uses back arrows and a FAB, not a tab bar.
- **No dark mode.** Light mode only.
- **No charts or complex data visualizations.** Just the simple linear progress bar in the header.
- **No authentication screens.**
- **Icons:** Use simple line icons throughout (Lucide style) — especially `ArrowLeft`, `Plus`, `Utensils` (fork/knife), `Camera`, `Image`.
- **Feel:** Polished consumer health app. The kind of app that ships in the App Store. Not a prototype, not a dashboard — a clean mobile product.

---

Please render all 4 screens as mobile frames (375px wide), with the two alternate states for Screen 2, 3, and 4 shown as smaller supplementary frames or annotations. Use realistic content — not lorem ipsum.
