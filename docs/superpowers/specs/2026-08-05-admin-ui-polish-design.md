# Admin UI Polish — Dark Theme Design

**Date:** 2026-08-05  
**App:** `apps/ai-web`  
**Status:** Approved for planning

## Goal

Make the existing AI Food admin panel feel like a full product console: dark Ant Design theme throughout, denser layout, and better operational UX on current pages — without new backend APIs or new admin sections.

## Decisions

| Topic | Choice |
|-------|--------|
| Scope | Visual polish + operational UX (option C) |
| Theme | Full dark via `antd` `theme.darkAlgorithm` |
| Accent | Default Ant Design blue |
| Approach | Theme-first polish (approach 1) |
| Stack | Keep Ant Design + React Query + existing routes |

## Out of scope

- New admin sections (payments list, usage logs, etc.)
- New gateway/API endpoints or schema changes
- Charts / analytics libraries
- CSV export, bulk actions
- Replacing Ant Design or redesigning information architecture

## Architecture

No new data layer. Changes are UI-only in `apps/ai-web`:

1. **Theme root** — `AdminProviders` enables dark algorithm for all admin screens including login.
2. **Shell** — `AdminShell` + `globals.css` aligned to dark surfaces.
3. **Pages** — Overview, Pricing, Subscriptions, Login restyled; shared page header component optional.
4. **Client-only UX** — status filter and pagination on subscriptions use data already returned by `GET users`.

## Theme & shell

### ConfigProvider

In `AdminProviders.tsx`:

```ts
import { theme } from 'antd';

<ConfigProvider
  locale={ruRU}
  theme={{ algorithm: theme.darkAlgorithm }}
>
```

No custom token pack beyond what is needed for layout polish. Primary color stays Ant Design default blue.

### AdminShell

- Dark sider + dark header + dark content (no white header strip).
- Logo block: «AI Food» + secondary label «Admin».
- Nav unchanged: Обзор `/admin`, Цены `/admin/pricing`, Подписки `/admin/subscriptions`.
- Header: current page title on the left, logout on the right.
- Existing `breakpoint="lg"` / `collapsedWidth={0}` behavior kept for narrow screens.
- Content full-width with consistent padding.

### Login

Same dark theme. Centered card on dark page background. Remove/replace light `#f5f5f5` body/`main` styles so login is not a bright island.

### globals.css

Update admin-related rules for dark surfaces (layout, logo, header, content). Landing page styles may stay separate if unused by admin; do not break non-admin routes if any remain light.

## Overview (`/admin`)

- Page header: title «Обзор» + short subtitle (users / payments / usage summary).
- Same 8 stats from existing `stats` API, visually grouped:
  - **Пользователи:** всего пользователей, активные подписки
  - **Платежи:** подтверждённые платежи, сумма платежей
  - **Usage:** анализы/уточнения за 7 и 30 дней
- Cards use denser grid; active subscriptions may use success-colored Statistic value.
- Loading via Statistic `loading`; errors via Alert; zeros shown as `0`.

## Subscriptions (`/admin/subscriptions`)

- Page header + subtitle.
- Toolbar:
  - Search (ID / Telegram ID / username) — existing behavior
  - Client-side status filter: Все / Активные / Неактивные (`hasActiveSubscription`)
  - Compact summary: found N · active M (from current result set)
- Table:
  - Same columns and mutation actions (activate / extend / revoke)
  - Status `Tag` (green vs default)
  - Client-side pagination via Ant Design Table
  - Actions remain buttons; on tight widths use wrap or Dropdown if needed for overflow
- Modals/Popconfirm unchanged logically; inherit dark theme.
- Empty and error locale strings remain clear and actionable.

## Pricing (`/admin/pricing`)

- Page header + subtitle.
- Form card ~560–640px wide (not a tiny island in empty space).
- Source tag (`db` / `env`) prominent above the form.
- Validation and PUT payload unchanged.

## Shared UI (optional small helper)

Introduce a thin `PageHeader` (title + optional subtitle + optional extra) used by Overview, Pricing, Subscriptions to keep page chrome consistent. Not required if inline Typography is cleaner — prefer one shared component if it reduces duplication.

## Error & empty states

- Query errors: Ant Design `Alert` or table `locale.emptyText` with the error message.
- Empty search/filter: «Пользователи не найдены» (or equivalent).
- No apologetic copy; state what failed and what the user can do (retry by changing filter / reloading).

## Testing / verification

Manual:

1. Login page renders dark; successful login enters dark shell.
2. Overview cards load and group correctly; error path shows Alert.
3. Pricing loads/saves; source tag visible.
4. Subscriptions: search, status filter, pagination, activate/extend/revoke still work.
5. Mobile/narrow: sider collapses; table scrolls horizontally; actions usable.
6. Logout still redirects to login.

No new automated tests required unless the repo already has ai-web UI tests (currently none).

## Files likely touched

- `apps/ai-web/src/components/AdminProviders.tsx`
- `apps/ai-web/src/components/AdminShell.tsx`
- `apps/ai-web/src/app/globals.css`
- `apps/ai-web/src/app/admin/page.tsx`
- `apps/ai-web/src/app/admin/pricing/page.tsx`
- `apps/ai-web/src/app/admin/subscriptions/page.tsx`
- `apps/ai-web/src/app/admin/login/page.tsx`
- Optional: `apps/ai-web/src/components/PageHeader.tsx`

## Success criteria

- Entire admin surface (login + shell + three pages) uses Ant Design dark theme consistently.
- Subscriptions feel operable: filter + pagination + summary without new API.
- Overview and Pricing look grouped and intentional, not sparse prototype cards.
- No regressions in existing admin API flows.
