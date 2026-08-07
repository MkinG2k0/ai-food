---
phase: 260807-kjb-android-home-widget-apple-fitness-style-
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - android/app/src/main/java/com/aifood/app/KbjuWidgetSnapshot.java
  - android/app/src/main/java/com/aifood/app/KbjuRingsWidgetProvider.java
  - android/app/src/main/java/com/aifood/app/KbjuActivityRingsWidgetProvider.java
  - android/app/src/main/java/com/aifood/app/KbjuWidgetPlugin.java
  - android/app/src/main/AndroidManifest.xml
  - android/app/src/main/res/layout/widget_kbju_activity_rings.xml
  - android/app/src/main/res/layout/widget_preview_kbju_activity_rings.xml
  - android/app/src/main/res/xml/widget_kbju_activity_rings_info.xml
  - android/app/src/main/res/drawable/widget_preview_kbju_activity_rings.png
  - android/app/src/main/res/values/strings.xml
autonomous: true
requirements:
  - QUICK-260807-kjb
must_haves:
  truths:
    - "Picker shows a second KBJU widget (~2×2) labeled in Russian (e.g. «КБЖУ кольца» / «Активность КБЖУ») with previewLayout + previewImage"
    - "Widget renders four concentric Apple-style rings outer→inner: Ккал emerald #10B981 → Белки rose #FB7185 → Жиры amber #FBBF24 → Углеводы sky #0EA5E9"
    - "Over-goal ring uses destructive red fill; muted track under each ring; thick stroke + ROUND caps"
    - "Tap opens MainActivity via ACTION_MAIN + CATEGORY_LAUNCHER (same as existing rings widget)"
    - "Both KBJU widgets refresh from existing Preferences key ai-food-widget-kbju via KbjuWidget.refresh — no new JS snapshot logic"
    - "Existing KbjuRingsWidgetProvider (2×2 separate cells), WeeklyCaloriesWidgetProvider, and add-food widgets remain registered and functional"
  artifacts:
    - path: android/app/src/main/java/com/aifood/app/KbjuWidgetSnapshot.java
      provides: "Shared CapacitorStorage / ai-food-widget-kbju JSON parse + Snapshot model"
    - path: android/app/src/main/java/com/aifood/app/KbjuActivityRingsWidgetProvider.java
      provides: "Concentric 4-ring Canvas bitmap AppWidgetProvider"
    - path: android/app/src/main/res/xml/widget_kbju_activity_rings_info.xml
      provides: "2×2 appwidget-provider with previewLayout + previewImage"
    - path: android/app/src/main/AndroidManifest.xml
      provides: "Receiver registration for KbjuActivityRingsWidgetProvider"
  key_links:
    - from: KbjuWidgetPlugin.refresh
      to: KbjuRingsWidgetProvider + KbjuActivityRingsWidgetProvider + WeeklyCaloriesWidgetProvider
      via: "notifyProvider APPWIDGET_UPDATE for each class"
    - from: KbjuActivityRingsWidgetProvider
      to: KbjuWidgetSnapshot.read
      via: "same PREFS_GROUP CapacitorStorage + PREFS_KEY ai-food-widget-kbju as jk6"
    - from: RemoteViews ImageView
      to: drawConcentricRings Bitmap
      via: "setImageViewBitmap on single ring ImageView"
---

<objective>
Add a second Android home widget: Apple Fitness–style concentric KBJU activity rings (one bitmap, four nested arcs), reusing the existing `ai-food-widget-kbju` Preferences snapshot and keeping the current 2×2 separate-rings widget intact (D-01–D-10).

Purpose: Glanceable Apple Activity Rings look without duplicating JS sync or breaking weekly/add-food widgets.
Output: Shared `KbjuWidgetSnapshot` helper, `KbjuActivityRingsWidgetProvider` + layout/info/preview resources, manifest receiver, plugin refresh notify.
</objective>

<execution_context>
@$HOME/.cursor/gsd-core/workflows/execute-plan.md
@$HOME/.cursor/gsd-core/templates/summary.md
</execution_context>

<context>
@apps/ai-food/.planning/STATE.md
@apps/ai-food/.planning/quick/260807-jk6-android-home-widget-today-kbju-progress-/260807-jk6-SUMMARY.md
@apps/ai-food/android/app/src/main/java/com/aifood/app/KbjuRingsWidgetProvider.java
@apps/ai-food/android/app/src/main/java/com/aifood/app/KbjuWidgetPlugin.java
@apps/ai-food/android/app/src/main/AndroidManifest.xml
@apps/ai-food/android/app/src/main/res/layout/widget_kbju_rings.xml
@apps/ai-food/android/app/src/main/res/xml/widget_kbju_rings_info.xml
@apps/ai-food/android/app/src/main/res/values/colors.xml
@apps/ai-food/android/app/src/main/res/values/strings.xml
</context>

## Locked decisions (honor exactly)

| ID | Decision |
|----|----------|
| D-01 | **Another** KBJU rings widget (Apple Fitness concentric); keep existing `KbjuRingsWidgetProvider` 2×2 separate cells |
| D-02 | Tap opens app home via MAIN/LAUNCHER PendingIntent (FLAG_IMMUTABLE on M+) |
| D-03 | Reuse snapshot key `ai-food-widget-kbju` — **no new JS** snapshot/sync unless tiny native labels only |
| D-04 | Outer→inner rings: Ккал `#10B981` → Белки `#FB7185` → Жиры `#FBBF24` → Углеводы `#0EA5E9` (reuse `widget_kbju_*` colors) |
| D-05 | Thick Apple-style stroke tracks, ROUND caps, muted track; over-goal → `widget_kbju_over` red |
| D-06 | ~2×2 size; white/dark-friendly card; optional center remaining-kcal text and/or tiny legend |
| D-07 | `previewLayout` + `previewImage`; Russian picker label e.g. «КБЖУ кольца» or «Активность КБЖУ» |
| D-08 | New `KbjuActivityRingsWidgetProvider` draws **one** Bitmap with 4 concentric arcs via Canvas |
| D-09 | Prefer package-private `KbjuWidgetSnapshot` shared helper (extract from existing rings provider) to avoid parse drift |
| D-10 | Register in manifest; extend `KbjuWidgetPlugin.refresh` notify list; do not break WeeklyCalories or add-food widgets |

## Source audit

| SOURCE | ID | Item | Plan | Status |
|--------|-----|------|------|--------|
| GOAL | — | Concentric Apple-style KBJU home widget reusing snapshot | 01 | COVERED |
| REQ | QUICK-260807-kjb | Android concentric KBJU activity rings widget | 01 | COVERED |
| CONTEXT | D-01..D-10 | Locked visual/native decisions above | 01 | COVERED |
| RESEARCH | — | N/A (quick; pattern from jk6 SUMMARY) | 01 | COVERED |

<tasks>

<task type="auto">
  <name>Task 1: Extract KbjuWidgetSnapshot shared helper</name>
  <files>android/app/src/main/java/com/aifood/app/KbjuWidgetSnapshot.java, android/app/src/main/java/com/aifood/app/KbjuRingsWidgetProvider.java</files>
  <read_first>
    - android/app/src/main/java/com/aifood/app/KbjuRingsWidgetProvider.java (Snapshot nested class, readSnapshot, FALLBACK_* constants, PREFS_GROUP/PREFS_KEY, stale-date zero-consumed behavior)
  </read_first>
  <action>
    Per D-09 / D-03: create package-private `com.aifood.app.KbjuWidgetSnapshot` that owns Capacitor Preferences reading for key `ai-food-widget-kbju` in SharedPreferences group `CapacitorStorage`.

    Move from `KbjuRingsWidgetProvider` without behavior change:
    - Nested `Snapshot` fields (date, consumed/goal kcal+protein+fat+carbs)
    - FALLBACK goals (2000 / 150 / 70 / 250)
    - `read(Context)` (or `readSnapshot`) — same JSON shape (`date`, `goals`, `consumed`), same stale-date → zero consumed, same malformed/empty → fallback goals + zero consumed
    - `fallbackGoals`, `withZeroConsumed`, `localDateToday` helpers

    Refactor `KbjuRingsWidgetProvider` to call `KbjuWidgetSnapshot.read(context)` and use `KbjuWidgetSnapshot.Snapshot` (or keep a thin alias). Do **not** change ring drawing, layout IDs, PendingIntent, or visual behavior of the existing 2×2 separate-rings widget (D-01).

    Do **not** touch WeeklyCaloriesWidgetProvider snapshot parsing in this task (different JSON shape). Do **not** add JS files.
  </action>
  <verify>
    <automated>cd apps/ai-food/android &amp;&amp; (if not set, JAVA_HOME to Android Studio JBR) ./gradlew :app:compileDebugJavaWithJavac --quiet</automated>
  </verify>
  <done>
    `KbjuWidgetSnapshot.java` exists; `KbjuRingsWidgetProvider` compiles and uses the shared reader; no duplicate PREFS parse logic remains inside the rings provider; existing 2×2 widget code path otherwise unchanged.
  </done>
</task>

<task type="auto">
  <name>Task 2: Concentric activity rings provider + wire refresh</name>
  <files>android/app/src/main/java/com/aifood/app/KbjuActivityRingsWidgetProvider.java, android/app/src/main/java/com/aifood/app/KbjuWidgetPlugin.java, android/app/src/main/AndroidManifest.xml, android/app/src/main/res/layout/widget_kbju_activity_rings.xml, android/app/src/main/res/layout/widget_preview_kbju_activity_rings.xml, android/app/src/main/res/xml/widget_kbju_activity_rings_info.xml, android/app/src/main/res/drawable/widget_preview_kbju_activity_rings.png, android/app/src/main/res/values/strings.xml</files>
  <read_first>
    - android/app/src/main/java/com/aifood/app/KbjuRingsWidgetProvider.java (drawRing stroke/cap pattern, buildOpenAppPendingIntent)
    - android/app/src/main/java/com/aifood/app/KbjuWidgetPlugin.java
    - android/app/src/main/res/xml/widget_kbju_rings_info.xml
    - android/app/src/main/res/layout/widget_preview_kbju_rings.xml
    - android/app/src/main/AndroidManifest.xml (KbjuRingsWidgetProvider receiver block)
    - android/app/src/main/res/values/colors.xml (widget_kbju_kcal/protein/fat/carbs/over/track/card)
  </read_first>
  <action>
    Per D-01, D-04–D-08: add `KbjuActivityRingsWidgetProvider` (AppWidgetProvider) that:
    1. Reads via `KbjuWidgetSnapshot.read(context)`.
    2. Builds RemoteViews from a new layout with a white/card root (`widget_kbju_card` or existing `widget_button_bg`), one centered ImageView for the rings bitmap, and optional center TextView for remaining kcal (e.g. max(0, round(goalKcal − consumedKcal)) + short «ккал» / remaining label) — D-06 discretion: prefer center remaining kcal over a dense legend if space is tight; tiny colored legend OK if it fits without clutter.
    3. Implements `drawConcentricRings(sizePx, snapshot, colors…)`: **one** ARGB_8888 Bitmap; four nested RectF arcs outer→inner Ккал→Белки→Жиры→Углеводы; stroke width ~12–16% of radius gap so rings look thick like Activity Rings; Paint STROKE + Cap.ROUND; full muted track then progress sweep from −90°; progress = min(1, consumed/goal) with goal≤0 treated as 1; if consumed &gt; goal use `widget_kbju_over` for that ring’s fill only (D-05).
    4. Tap: PendingIntent to MainActivity ACTION_MAIN + CATEGORY_LAUNCHER, FLAG_UPDATE_CURRENT | FLAG_IMMUTABLE (M+), distinct requestCode from existing rings widget (do not collide with 260807) — D-02.

    Resources (mirror jk6 naming):
    - `widget_kbju_activity_rings.xml` layout
    - `widget_preview_kbju_activity_rings.xml` (FrameLayout + preview ImageView like existing preview)
    - `widget_kbju_activity_rings_info.xml`: minWidth/Height 110dp, targetCell 2×2, resizeMode none, updatePeriodMillis 0, previewLayout + previewImage — D-07
    - `drawable/widget_preview_kbju_activity_rings.png`: simple concentric-rings preview asset (can generate a small PNG programmatically or copy/adapt existing preview art to show nested rings)
    - `strings.xml`: `widget_kbju_activity_description` = «КБЖУ кольца» or «Активность КБЖУ» (Russian picker label)

    Manifest: add exported receiver for `.KbjuActivityRingsWidgetProvider` with APPWIDGET_UPDATE + meta-data `@xml/widget_kbju_activity_rings_info`, label `@string/widget_kbju_activity_description`. Do not remove or alter other receivers (D-10).

    Plugin (D-10): in `KbjuWidgetPlugin.refresh`, also `notifyProvider(..., KbjuActivityRingsWidgetProvider.class)` alongside existing rings + weekly providers.

    Do not modify JS (`features/kbju-widget`, `computeTodayKbjuSnapshot`). Do not change `KbjuRingsWidgetProvider` layout/visuals beyond Task 1 helper usage.
  </action>
  <verify>
    <automated>cd apps/ai-food/android &amp;&amp; ./gradlew :app:compileDebugJavaWithJavac --quiet &amp;&amp; rg -n "KbjuActivityRingsWidgetProvider" android/app/src/main/AndroidManifest.xml android/app/src/main/java/com/aifood/app/KbjuWidgetPlugin.java</automated>
  </verify>
  <done>
    New provider compiles; manifest + info/preview/strings present; plugin notifies three providers (separate rings, activity rings, weekly); concentric bitmap uses locked color order and over-goal red; tap opens MAIN/LAUNCHER; no JS snapshot changes.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Capacitor Preferences → AppWidgetProvider | Untrusted/malformed JSON string from web layer |
| Home screen → App | Widget tap launches MainActivity |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-kjb-01 | Tampering | KbjuWidgetSnapshot JSON parse | low | mitigate | Same as jk6: try/catch + fallback goals + zero consumed on bad/stale data; no code execution from JSON |
| T-kjb-02 | Elevation | PendingIntent open app | medium | mitigate | FLAG_IMMUTABLE on API 23+; explicit MainActivity component; no deep-link extras from widget |
| T-kjb-03 | Information disclosure | Widget RemoteViews | low | accept | Only daily KBJU totals already shown on home; no auth tokens in snapshot |
| T-kjb-SC | Tampering | npm/pip installs | low | accept | No new package-manager deps in this plan (native Java/XML only) |
</threat_model>

<verification>
- `./gradlew :app:compileDebugJavaWithJavac --quiet` succeeds
- Manifest contains `KbjuActivityRingsWidgetProvider` receiver; `KbjuRingsWidgetProvider` still present
- `KbjuWidgetPlugin.refresh` notifies activity rings provider
- Optional device smoke: pin «КБЖУ кольца», confirm concentric rings update after meal sync; tap → home; existing «КБЖУ сегодня» + weekly + add-food widgets still work
</verification>

<success_criteria>
- Second ~2×2 home widget with Apple-style concentric KBJU rings ships on Android
- Shared snapshot helper prevents parse drift between the two KBJU widgets
- Existing separate-rings, weekly chart, and add-food widgets untouched in behavior
- Zero new JS snapshot/sync code
</success_criteria>

<output>
Create `apps/ai-food/.planning/quick/260807-kjb-android-home-widget-apple-fitness-style-/260807-kjb-SUMMARY.md` when done
</output>
