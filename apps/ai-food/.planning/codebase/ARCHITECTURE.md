# Architecture

**Analysis Date:** 2026-08-03

## Pattern Overview

**Overall:** Single-package Feature-Sliced Design (FSD) frontend (Vite/React) + Capacitor Android

**Key Characteristics:**
- One pnpm package at repo root ? no Turborepo / workspaces
- FSD layers with strict top-down import direction
- Server/async state via TanStack Query; client/UI state via Zustand
- Domain types in `src/shared/types` (alias `@ai-food/shared-types`)
- AI via sibling OpenRouter gateway repo `ai-app` (`VITE_AI_GATEWAY_*`); no in-repo backend ? see `docs/AI-GATEWAY.md`

## Layers

**App (composition root):**
- Purpose: Bootstrap React, wire global providers, define routes
- Location: `src/app/`
- Contains: `index.tsx`, `providers.tsx`, `router.tsx`, guards, styles
- Depends on: `pages/*`, `shared/lib` (queryClient)
- Used by: `src/main.tsx`

**Pages (route shells):**
- Purpose: Thin route-level components that compose widgets and features
- Location: `src/pages/*`
- Depends on: `widgets/*`, `features/*`, `entities/*`, `shared/*`
- Used by: `src/app/router.tsx`

**Widgets (composed UI blocks):**
- Purpose: Reusable multi-entity UI sections used across pages
- Location: `src/widgets/*`
- Depends on: `entities/*`, `shared/*`
- Used by: `pages/*`

**Features (user actions & workflows):**
- Purpose: Encapsulate user-facing capabilities with model + optional API/UI
- Location: `src/features/*`
- Depends on: `entities/*`, `shared/*`, `@ai-food/shared-types`
- Used by: `pages/*`

**Entities (domain objects):**
- Purpose: Core business objects and their presentation
- Location: `src/entities/{meal,nutrition}/`
- Depends on: `shared/*`, `@ai-food/shared-types`
- Used by: `widgets/*`, `pages/*`, `features/*`

**Shared (cross-cutting):**
- Purpose: Utilities, HTTP client, design system, domain types
- Location: `src/shared/{api,lib,ui,types}/`
- Depends on: third-party libs only
- Used by: All upper layers

## Data Flow

- **Zustand (client state):** image selection, diary, profile, settings, favorites, weight
- **TanStack Query (server/async state):** analyze / refine / custom content / micronutrient targets
- **Rule:** API responses are not stored in Zustand as a server cache; diary holds mapped `Meal` objects only

## Key Abstractionsctions

- Barrel `index.ts` at each public FSD slice boundary
- Axios client with error normalization to `ApiError`
- React Query hooks for async AI calls
- Orchestration hooks (e.g. `useSaveMeal`) composing stores + navigation

## Entry Points

- `src/main.tsx` ? React mount
- `src/app/index.tsx` ? Providers + router
- `src/app/router.tsx` ? routes
- `pnpm dev` ? Vite :5173
- `pnpm cap:sync` / `pnpm cap:open:android` ? native shell

## Error Handling

- Axios interceptor maps errors to `ApiError`
- UI surfaces query `isError` / retry flows on meal analyze paths

## Cross-Cutting Concerns

- Persistence: Capacitor Preferences (local cache) + server sync after login for diary / profile / weight / favorites (`docs/USER-DATA-SYNC.md`)
- Images: Capacitor Filesystem — **not synced** between devices
- PWA: `vite-plugin-pwa`

---

*Architecture analysis: 2026-08-13 (monorepo + user-data sync)*
