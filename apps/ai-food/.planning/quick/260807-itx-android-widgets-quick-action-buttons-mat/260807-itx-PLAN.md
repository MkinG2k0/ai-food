---
phase: 260807-itx
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/shared/lib/addFoodDeepLink.ts
  - src/shared/lib/addFoodDeepLink.test.ts
  - src/app/DeepLinkHandler.tsx
  - src/app/AppShell.tsx
  - src/features/add-food/ui/AddFoodSheet.tsx
  - src/pages/home/ui/HomePage.tsx
  - android/app/src/main/AndroidManifest.xml
  - android/app/src/main/java/com/aifood/app/MainActivity.java
  - android/app/src/main/java/com/aifood/app/AddFoodWidgetProvider.java
  - android/app/src/main/res/xml/add_food_widget_info.xml
  - android/app/src/main/res/layout/widget_add_food.xml
  - android/app/src/main/res/drawable/widget_button_bg.xml
  - android/app/src/main/res/drawable/ic_widget_camera.xml
  - android/app/src/main/res/drawable/ic_widget_pen.xml
  - android/app/src/main/res/drawable/ic_widget_gallery.xml
  - android/app/src/main/res/drawable/ic_widget_keyboard.xml
  - android/app/src/main/res/drawable/ic_widget_star.xml
  - android/app/src/main/res/values/strings.xml
  - android/app/src/main/res/values/colors.xml
autonomous: true
requirements:
  - QUICK-260807-itx
must_haves:
  truths:
    - "На Android home screen доступен виджет с 6 кнопками: Камера/Штрихкод, Камера+Описание, Галерея, Описать, Вручную, Избранное"
    - "Тап по кнопке виджета открывает приложение и сразу запускает то же действие, что пункт меню AddFoodSheet"
    - "Холодный старт и resume (приложение уже в фоне) оба обрабатывают deep link"
    - "Неизвестные URL/action игнорируются без навигации"
  artifacts:
    - path: "src/shared/lib/addFoodDeepLink.ts"
      provides: "Парсер aifood://add/<action> → route/action"
      contains: "parseAddFoodDeepLink"
    - path: "src/app/DeepLinkHandler.tsx"
      provides: "Capacitor App getLaunchUrl + appUrlOpen → navigate"
      contains: "appUrlOpen"
    - path: "android/app/src/main/java/com/aifood/app/AddFoodWidgetProvider.java"
      provides: "App Widget с PendingIntent на 6 actions"
      contains: "AppWidgetProvider"
    - path: "android/app/src/main/res/layout/widget_add_food.xml"
      provides: "UI виджета: белые кнопки, зелёные иконки, RU labels"
      contains: "Камера"
  key_links:
    - from: "AddFoodWidgetProvider PendingIntent ACTION_VIEW"
      to: "MainActivity intent-filter aifood://"
      via: "Uri aifood://add/<action>"
    - from: "DeepLinkHandler"
      to: "AddFoodSheet / router paths"
      via: "parseAddFoodDeepLink mapping (same as AddFoodSheet handlers)"
    - from: "HomePage ?add=gallery|describe"
      to: "AddFoodSheet autoAction"
      via: "searchParams cleared after consume"
---

<objective>
Добавить Android home-screen widget с шестью quick-action кнопками (как меню «Добавить еду»), каждая из которых через custom-scheme deep link сразу запускает соответствующий flow в Capacitor WebView.

Purpose: быстрый вход в добавление еды с лончера без открытия FAB → sheet.
Output: native App Widget + JS deep-link handler, привязанный к тем же путям, что `AddFoodSheet`.
</objective>

<execution_context>
@$HOME/.cursor/gsd-core/workflows/execute-plan.md
@$HOME/.cursor/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/PROJECT.md
@src/features/add-food/ui/AddFoodSheet.tsx
@src/pages/home/ui/HomePage.tsx
@src/app/BackButtonHandler.tsx
@src/app/AppShell.tsx
@src/app/router.tsx
@android/app/src/main/AndroidManifest.xml
@android/app/src/main/java/com/aifood/app/MainActivity.java
@capacitor.config.ts
@package.json
</context>

<interface>
## Deep link contract (canonical)

Scheme/host/path: `aifood://add/<action>`

| action | Behavior (mirror AddFoodSheet) |
|--------|--------------------------------|
| `scan` | navigate `/scan` |
| `scan-describe` | navigate `/scan?describe=1` |
| `gallery` | navigate `/?add=gallery` → Home opens sheet + triggers gallery file picker |
| `describe` | navigate `/?add=describe` → Home opens sheet in describe mode |
| `manual` | navigate `/manual-entry` |
| `favorites` | navigate `/favorites` |

Also accept Capacitor-style URLs if bridge rewrites host: any URL whose path/host ends with `/add/<action>` or whose pathname is `/add/<action>` with scheme `aifood` or `com.aifood.app`.

## Exports

- `parseAddFoodDeepLink(url: string): { kind: 'route'; path: string } | { kind: 'home-add'; add: 'gallery' \| 'describe' } | null`
- `DeepLinkHandler` — null-render component (like `BackButtonHandler`), mounted in `AppShell`
- `AddFoodSheet` gains optional `autoAction?: 'gallery' | 'describe' | null` — when `open` becomes true with autoAction, run gallery click or set mode to describe once, then clear via callback `onAutoActionConsumed`

## Android

- `AddFoodWidgetProvider extends AppWidgetProvider` (Java, same package as MainActivity)
- Widget min size ~ 250dp × 280dp (one column of 6 rows)
- Each row: `PendingIntent.getActivity` with `Intent.ACTION_VIEW` + `Uri.parse("aifood://add/...")` + `FLAG_ACTIVITY_NEW_TASK | FLAG_ACTIVITY_CLEAR_TOP` targeting `MainActivity`, requestCode unique per action
- Manifest: `<receiver>` for widget + `ACTION_APPWIDGET_UPDATE`; on `MainActivity` add `VIEW`/`BROWSABLE` intent-filter for scheme `aifood` host `add` (pathPrefix `/` or pathPattern)
</interface>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Deep-link parser + Capacitor handler + Home/AddFoodSheet wiring</name>
  <files>src/shared/lib/addFoodDeepLink.ts, src/shared/lib/addFoodDeepLink.test.ts, src/app/DeepLinkHandler.tsx, src/app/AppShell.tsx, src/features/add-food/ui/AddFoodSheet.tsx, src/pages/home/ui/HomePage.tsx</files>
  <behavior>
    - parseAddFoodDeepLink('aifood://add/scan') → route `/scan`
    - parseAddFoodDeepLink('aifood://add/scan-describe') → route `/scan?describe=1`
    - parseAddFoodDeepLink('aifood://add/manual') → `/manual-entry`
    - parseAddFoodDeepLink('aifood://add/favorites') → `/favorites`
    - parseAddFoodDeepLink('aifood://add/gallery') → home-add gallery
    - parseAddFoodDeepLink('aifood://add/describe') → home-add describe
    - parseAddFoodDeepLink('aifood://add/unknown') → null
    - parseAddFoodDeepLink('https://example.com') → null
  </behavior>
  <action>
    1. Create `parseAddFoodDeepLink` with a strict allowlist of the six actions above (mirror handlers in AddFoodSheet: camera→/scan, camera+describe→/scan?describe=1, manual→/manual-entry, favorites→/favorites; gallery/describe as home-add). No new npm deps.
    2. Add Vitest coverage in `addFoodDeepLink.test.ts` for the behavior cases; implement until green.
    3. Create `DeepLinkHandler` following `BackButtonHandler` patterns: only run when `Capacitor.isNativePlatform()` (or android), call `App.getLaunchUrl()` once on mount, subscribe to `App.addListener('appUrlOpen')`, map URL via parser, `navigate(path)` or `navigate({ pathname: '/', search: '?add=gallery|describe' })`, then `replace` to strip consumed home query if needed by HomePage. Remove listener on unmount. Deduplicate identical URL handled twice in rapid succession (launchUrl + appUrlOpen).
    4. Mount `DeepLinkHandler` next to `BackButtonHandler` in `AppShell`.
    5. Extend `AddFoodSheet`: optional `autoAction` and `onAutoActionConsumed`. When open+autoAction=gallery, programmatically trigger the same path as gallery button (file input click) then call consumed. When describe, set mode to describe then consumed. Do not change the six visible menu labels/icons.
    6. In `HomePage`, read `useSearchParams` for `add=gallery|describe`; if present, set sheet open with matching autoAction, then `setSearchParams` to delete `add` so refresh does not re-trigger.
  </action>
  <verify>
    <automated>pnpm test -- src/shared/lib/addFoodDeepLink.test.ts && pnpm type-check</automated>
  </verify>
  <done>
    Parser covers all six actions; DeepLinkHandler mounted; gallery/describe open via `?add=`; type-check clean.
  </done>
</task>

<task type="auto">
  <name>Task 2: Android App Widget + intent-filter + MainActivity launch handoff</name>
  <files>android/app/src/main/java/com/aifood/app/AddFoodWidgetProvider.java, android/app/src/main/java/com/aifood/app/MainActivity.java, android/app/src/main/AndroidManifest.xml, android/app/src/main/res/xml/add_food_widget_info.xml, android/app/src/main/res/layout/widget_add_food.xml, android/app/src/main/res/drawable/widget_button_bg.xml, android/app/src/main/res/drawable/ic_widget_camera.xml, android/app/src/main/res/drawable/ic_widget_pen.xml, android/app/src/main/res/drawable/ic_widget_gallery.xml, android/app/src/main/res/drawable/ic_widget_keyboard.xml, android/app/src/main/res/drawable/ic_widget_star.xml, android/app/src/main/res/values/strings.xml, android/app/src/main/res/values/colors.xml</files>
  <action>
    1. Add `colors.xml` with emerald accent (~#059669) for icon tint; `widget_button_bg.xml` as white rounded rectangle with light stroke (outline button look matching sheet).
    2. Add simple vector drawables for camera, pen, gallery/image, keyboard, star (stroke-style, tinted emerald). Reuse pen for both «Камера + Описание» and «Описать».
    3. Create `widget_add_food.xml`: vertical LinearLayout, six rows; each row is a clickable layout (icon + TextView RU label exactly: «Камера / Штрихкод», «Камера + Описание», «Галерея», «Описать», «Вручную», «Избранное»). Use `@+id/btn_scan` etc.
    4. `add_food_widget_info.xml`: `initialLayout` → widget layout; `updatePeriodMillis=0`; `resizeMode` vertical|horizontal; `widgetCategory=home_screen`; description string in strings.xml («Быстрое добавление еды»).
    5. Implement `AddFoodWidgetProvider` in Java: in `onUpdate`, inflate RemoteViews, for each button set `setOnClickPendingIntent` with VIEW intent `aifood://add/<action>` to `MainActivity`, `PendingIntent.FLAG_UPDATE_CURRENT | FLAG_IMMUTABLE`, unique requestCodes 1001–1006.
    6. Register receiver in `AndroidManifest.xml` with APPWIDGET_UPDATE + meta-data `android.appwidget.provider` → `@xml/add_food_widget_info`. On `MainActivity` keep LAUNCHER filter; add second intent-filter: ACTION_VIEW, categories DEFAULT+BROWSABLE, data android:scheme="aifood" android:host="add". Keep `launchMode=singleTask`.
    7. Extend `MainActivity`: override `onNewIntent`/`onCreate` to `setIntent(intent)` so Capacitor Bridge sees the latest VIEW URI for getLaunchUrl/appUrlOpen (call `super` appropriately; do not strip the data URI). Avoid Kotlin (no kotlin plugin in project).
    8. Do not add new Gradle dependencies — App Widgets use platform + existing AndroidX. After native files land, run `pnpm cap:sync` only if needed for web assets; widget code lives under `android/` and is not overwritten by sync for custom Java/res (verify custom files remain).
  </action>
  <verify>
    <automated>pnpm type-check && test -f android/app/src/main/java/com/aifood/app/AddFoodWidgetProvider.java && rg -n "aifood://add/" android/app/src/main/java/com/aifood/app/AddFoodWidgetProvider.java && rg -n 'android:scheme="aifood"' android/app/src/main/AndroidManifest.xml</automated>
  </verify>
  <done>
    Widget provider + layout + six PendingIntents + manifest intent-filter present; MainActivity forwards VIEW intents; labels match AddFoodSheet.
  </done>
</task>

<task type="auto">
  <name>Task 3: Smoke build wiring note + unit regression</name>
  <files>src/shared/lib/addFoodDeepLink.test.ts</files>
  <action>
    Re-run the deep-link unit tests after native wiring to ensure the action string constants still match widget URIs (`scan`, `scan-describe`, `gallery`, `describe`, `manual`, `favorites`). If any label/URI drift was introduced in Task 2, fix the shared allowlist so JS and Java stay in sync (document the six action tokens once in a short comment atop `addFoodDeepLink.ts` listing the Android twin class name `AddFoodWidgetProvider`).
    Optionally add one test asserting the full URI list equals the documented six (array snapshot of actions).
    Do not commit secrets or touch `capacitor.config.ts` server.url for this task.
  </action>
  <verify>
    <automated>pnpm test -- src/shared/lib/addFoodDeepLink.test.ts</automated>
    <human-check>
      1. `pnpm cap:build` (or Android Studio assembleDebug) and install on device/emulator.
      2. Long-press home → Widgets → AI Food → add «Быстрое добавление еды».
      3. Tap each of 6 buttons: expect /scan, /scan?describe=1, gallery picker, describe sheet, /manual-entry, /favorites.
      4. With app backgrounded, tap a widget button again — action still fires (singleTask + onNewIntent).
    </human-check>
  </verify>
  <done>
    Tests green; action tokens documented as shared contract with widget; human device checklist ready in SUMMARY.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Home-screen widget → MainActivity | Untrusted VIEW Intent URI crosses into app |
| Native bridge → WebView JS | URL string delivered via Capacitor App plugin |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-260807-itx-01 | Spoofing | aifood:// VIEW intents | low | accept | Custom scheme is app-private enough for launcher widgets; no auth elevation |
| T-260807-itx-02 | Tampering | DeepLinkHandler URL | medium | mitigate | Allowlist-only `parseAddFoodDeepLink`; unknown actions → no navigation |
| T-260807-itx-03 | Information disclosure | Intent logs | low | accept | No PII in action paths |
| T-260807-itx-04 | Denial of service | Rapid appUrlOpen | low | mitigate | Dedupe identical URL in DeepLinkHandler |
| T-260807-itx-05 | Elevation of privilege | Widget → AI routes | low | accept | Same capabilities as in-app AddFoodSheet; paywall/guards unchanged |
| T-260807-itx-SC | Tampering | npm/pip installs | low | accept | No new packages in this plan |
</threat_model>

<verification>
- Unit: `parseAddFoodDeepLink` six actions + null cases
- Static: widget class, layout ids, manifest scheme `aifood`, receiver registered
- Type-check: `pnpm type-check`
- Device (human): install widget, tap all six, cold + warm start
</verification>

<success_criteria>
1. Widget shows six RU buttons with outline/emerald icon style.
2. Each tap launches the matching AddFoodSheet action in-app.
3. Gallery and Describe work via Home `?add=` + AddFoodSheet autoAction.
4. Malformed deep links do nothing.
</success_criteria>

<output>
Create `.planning/quick/260807-itx-android-widgets-quick-action-buttons-mat/260807-itx-SUMMARY.md` when done
</output>
