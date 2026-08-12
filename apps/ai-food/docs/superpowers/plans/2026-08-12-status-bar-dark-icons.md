# Status bar dark icons — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** На Android Capacitor сделать системные иконки status bar тёмными и читаемыми на светлом UI.

**Architecture:** Один bootstrap-хелпер `configureStatusBar()` вызывается из `StatusBarBootstrap` в `AppShell`. Плагин `@capacitor/status-bar` + конфиг Capacitor + `windowLightStatusBar` в Android theme. Web не меняется.

**Tech Stack:** Capacitor 8, `@capacitor/status-bar` ^8, React, Vitest, `apps/ai-food`.

**Spec:** `apps/ai-food/docs/superpowers/specs/2026-08-12-status-bar-dark-icons-design.md`

## Global Constraints

- `Style.Dark` = тёмные иконки (Capacitor naming); не путать с `Style.Light`
- Вызывать только при `Capacitor.isNativePlatform() === true`
- Фон status bar: `#ffffff` (где платформа ещё поддерживает `setBackgroundColor`; на Android 15+ API может бросать — глотать ошибку)
- Не менять layout / safe-area / цвет шапки приложения
- Не делать per-screen switching (камера и т.п.)
- Коммиты — только если пользователь явно попросил; иначе пропускать шаги Commit

## File map

| File | Role |
|------|------|
| `apps/ai-food/package.json` | dependency `@capacitor/status-bar` |
| `apps/ai-food/capacitor.config.ts` | ранний native config StatusBar |
| `apps/ai-food/src/app/configureStatusBar.ts` | async bootstrap helper |
| `apps/ai-food/src/app/configureStatusBar.test.ts` | unit tests |
| `apps/ai-food/src/app/StatusBarBootstrap.tsx` | mount-once `useEffect` |
| `apps/ai-food/src/app/AppShell.tsx` | mount `StatusBarBootstrap` |
| `apps/ai-food/android/.../res/values/styles.xml` | `windowLightStatusBar` + white statusBarColor |
| `apps/ai-food/android/.../res/values/colors.xml` | optional `#FFFFFF` color resource |

---

### Task 1: `configureStatusBar` + unit tests

**Files:**
- Create: `apps/ai-food/src/app/configureStatusBar.ts`
- Create: `apps/ai-food/src/app/configureStatusBar.test.ts`
- Modify: `apps/ai-food/package.json` (add `@capacitor/status-bar`)

**Interfaces:**
- Produces: `configureStatusBar(): Promise<void>`
- Consumes: `Capacitor.isNativePlatform()`, `StatusBar.setStyle`, `StatusBar.setBackgroundColor`, `Style.Dark`

- [ ] **Step 1: Install dependency**

From `apps/ai-food`:

```bash
pnpm add @capacitor/status-bar@^8
```

Expected: `package.json` lists `"@capacitor/status-bar": "^8..."` (or compatible 8.x).

- [ ] **Step 2: Write the failing tests**

Create `apps/ai-food/src/app/configureStatusBar.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const isNativePlatform = vi.fn(() => false);
const setStyle = vi.fn(() => Promise.resolve());
const setBackgroundColor = vi.fn(() => Promise.resolve());

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => isNativePlatform(),
  },
}));

vi.mock('@capacitor/status-bar', () => ({
  StatusBar: {
    setStyle: (...args: unknown[]) => setStyle(...args),
    setBackgroundColor: (...args: unknown[]) => setBackgroundColor(...args),
  },
  Style: {
    Dark: 'DARK',
    Light: 'LIGHT',
    Default: 'DEFAULT',
  },
}));

describe('configureStatusBar', () => {
  beforeEach(() => {
    isNativePlatform.mockReset();
    setStyle.mockReset();
    setBackgroundColor.mockReset();
    setStyle.mockResolvedValue(undefined);
    setBackgroundColor.mockResolvedValue(undefined);
  });

  it('does nothing on web', async () => {
    isNativePlatform.mockReturnValue(false);
    const { configureStatusBar } = await import('./configureStatusBar');
    await configureStatusBar();
    expect(setStyle).not.toHaveBeenCalled();
    expect(setBackgroundColor).not.toHaveBeenCalled();
  });

  it('sets Dark style and white background on native', async () => {
    isNativePlatform.mockReturnValue(true);
    const { configureStatusBar } = await import('./configureStatusBar');
    await configureStatusBar();
    expect(setStyle).toHaveBeenCalledWith({ style: 'DARK' });
    expect(setBackgroundColor).toHaveBeenCalledWith({ color: '#ffffff' });
  });

  it('still succeeds if setBackgroundColor rejects', async () => {
    isNativePlatform.mockReturnValue(true);
    setBackgroundColor.mockRejectedValue(new Error('unsupported'));
    const { configureStatusBar } = await import('./configureStatusBar');
    await expect(configureStatusBar()).resolves.toBeUndefined();
    expect(setStyle).toHaveBeenCalled();
  });
});
```

Note: use dynamic `import('./configureStatusBar')` after mocks so Vitest picks them up; if the module is already cached across tests, reset modules:

```ts
beforeEach(() => {
  vi.resetModules();
  // ... mockReset as above
});
```

Put `vi.resetModules()` at the start of `beforeEach` (after the mockReset lines, before each test’s import).

- [ ] **Step 3: Run tests — expect FAIL**

```bash
pnpm --filter ai-food test -- src/app/configureStatusBar.test.ts
```

Expected: FAIL (module missing / `configureStatusBar` not found).

- [ ] **Step 4: Implement helper**

Create `apps/ai-food/src/app/configureStatusBar.ts`:

```ts
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

/** Dark icons + white bar for light Capacitor UI. No-op on web. */
export async function configureStatusBar(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  await StatusBar.setStyle({ style: Style.Dark });

  try {
    await StatusBar.setBackgroundColor({ color: '#ffffff' });
  } catch {
    // Android 15+ may not support status bar background color.
  }
}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
pnpm --filter ai-food test -- src/app/configureStatusBar.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 6: Commit** (only if user asked)

```bash
git add apps/ai-food/package.json apps/ai-food/pnpm-lock.yaml apps/ai-food/src/app/configureStatusBar.ts apps/ai-food/src/app/configureStatusBar.test.ts
# if lockfile is at repo root:
git add pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
feat(ai-food): add configureStatusBar helper for dark status icons

EOF
)"
```

---

### Task 2: Wire bootstrap + Capacitor config + Android theme

**Files:**
- Create: `apps/ai-food/src/app/StatusBarBootstrap.tsx`
- Modify: `apps/ai-food/src/app/AppShell.tsx`
- Modify: `apps/ai-food/capacitor.config.ts`
- Modify: `apps/ai-food/android/app/src/main/res/values/styles.xml`
- Modify: `apps/ai-food/android/app/src/main/res/values/colors.xml`

**Interfaces:**
- Consumes: `configureStatusBar(): Promise<void>`
- Produces: `StatusBarBootstrap` null component mounted in `AppShell`

- [ ] **Step 1: Create StatusBarBootstrap**

Create `apps/ai-food/src/app/StatusBarBootstrap.tsx`:

```tsx
import { useEffect } from 'react';
import { configureStatusBar } from './configureStatusBar';

/** Applies Capacitor StatusBar style once on native mount. */
export function StatusBarBootstrap() {
  useEffect(() => {
    void configureStatusBar();
  }, []);

  return null;
}
```

- [ ] **Step 2: Mount in AppShell**

Modify `apps/ai-food/src/app/AppShell.tsx` to import and render next to other handlers:

```tsx
import { Outlet } from 'react-router-dom';
import { KbjuWidgetSync } from '@/features/kbju-widget';
import { BackButtonHandler } from './BackButtonHandler';
import { DeepLinkHandler } from './DeepLinkHandler';
import { StatusBarBootstrap } from './StatusBarBootstrap';

/** Centers a phone-width column on desktop; full-bleed on small screens. */
export function AppShell() {
  return (
    <div className="min-h-dvh bg-zinc-200/90">
      <StatusBarBootstrap />
      <BackButtonHandler />
      <DeepLinkHandler />
      <KbjuWidgetSync />
      <div className="relative mx-auto min-h-dvh w-full max-w-md overflow-x-clip bg-zinc-50 shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_8px_40px_rgba(0,0,0,0.08)]">
        <Outlet />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Capacitor config (early native defaults)**

Modify `apps/ai-food/capacitor.config.ts`:

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aifood.app',
  appName: 'AI Food',
  webDir: 'dist',
  server: {
    // Point native shell to local Vite dev server during development.
    // Comment this out (or remove) before a production native build.
    // url: 'http://localhost:5173',
    cleartext: true, // allow http on Android debug builds
  },
  android: {
    allowMixedContent: true, // needed when server.url is http
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#ffffffff',
    },
  },
};

export default config;
```

Do **not** set `overlaysWebView` unless already required elsewhere — leave default so layout/safe-area stay as-is.

- [ ] **Step 4: Android theme safety net**

Add to `apps/ai-food/android/app/src/main/res/values/colors.xml`:

```xml
<color name="status_bar_background">#FFFFFF</color>
```

Update `AppTheme.NoActionBar` in `apps/ai-food/android/app/src/main/res/values/styles.xml`:

```xml
<style name="AppTheme.NoActionBar" parent="Theme.AppCompat.DayNight.NoActionBar">
    <item name="windowActionBar">false</item>
    <item name="windowNoTitle">true</item>
    <item name="android:background">@null</item>
    <item name="android:statusBarColor">@color/status_bar_background</item>
    <item name="android:windowLightStatusBar">true</item>
</style>
```

- [ ] **Step 5: Sync Capacitor Android**

From `apps/ai-food`:

```bash
pnpm cap:sync
```

Expected: sync succeeds; `@capacitor/status-bar` appears under Android dependencies / capacitor plugins.

- [ ] **Step 6: Type-check + unit tests**

```bash
pnpm --filter ai-food type-check
pnpm --filter ai-food test -- src/app/configureStatusBar.test.ts
```

Expected: both PASS.

- [ ] **Step 7: Manual verify (device/emulator)**

Rebuild/install APK (`pnpm build:mobile` or existing cap flow), open home diary on light UI. Status bar time / battery / network icons must be dark and readable on white/light area.

- [ ] **Step 8: Commit** (only if user asked)

```bash
git add apps/ai-food/src/app/StatusBarBootstrap.tsx apps/ai-food/src/app/AppShell.tsx apps/ai-food/capacitor.config.ts apps/ai-food/android/app/src/main/res/values/styles.xml apps/ai-food/android/app/src/main/res/values/colors.xml
git commit -m "$(cat <<'EOF'
feat(ai-food): apply dark status bar icons on Capacitor Android

EOF
)"
```

---

## Spec coverage (self-review)

| Spec item | Task |
|-----------|------|
| `@capacitor/status-bar` + `Style.Dark` | Task 1–2 |
| White background where supported | Task 1 (`#ffffff`) + Task 2 (config + theme) |
| Bootstrap once on native | Task 2 `StatusBarBootstrap` in `AppShell` |
| `windowLightStatusBar` | Task 2 `styles.xml` |
| `cap sync` | Task 2 Step 5 |
| Out of scope: per-screen / nav bar / theme-color | not in plan |

No placeholders. Interfaces consistent: `configureStatusBar(): Promise<void>`.
