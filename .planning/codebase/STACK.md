# Technology Stack

**Analysis Date:** 2026-06-24

## Languages

**Primary:**
- TypeScript 5.9.3 (resolved via `pnpm-lock.yaml`) — all application code in `apps/mobile/`, `apps/backend/`, `packages/shared-types/`
- TSX/JSX — React components in `apps/mobile/src/**/*.tsx`

**Secondary:**
- HTML — `apps/mobile/index.html` (Vite entry shell)
- CSS — `apps/mobile/src/app/styles/global.css` (Tailwind directives + CSS variables for shadcn/ui)
- JSON — workspace manifests (`package.json`, `turbo.json`, `components.json`)

## Runtime

**Environment:**
- Node.js >= 18 (declared in root `package.json` `engines`)
- Browser (Chromium/WebKit) — mobile app is a Vite SPA, not a native shell

**Package Manager:**
- pnpm 9.6.0 (pinned in root `package.json` `packageManager`)
- Lockfile: present (`pnpm-lock.yaml`)

## Frameworks

**Core:**
- React 18.3.1 — UI in `apps/mobile/`
- React Router DOM 6.24.1 — routing in `apps/mobile/src/app/router.tsx`
- Express 4.22.2 — mock HTTP API in `apps/backend/src/index.ts`
- Turborepo 2.9.18 — monorepo task orchestration (`turbo.json`)

**Testing:**
- Vitest 2.1.9 — unit tests in `apps/mobile/` (`vitest.config.ts`)
- Testing Library (`@testing-library/react` 16.0.0, `@testing-library/jest-dom` 6.4.6, `@testing-library/user-event` 14.5.2) — component/hook tests
- jsdom 24.1.3 — DOM environment for Vitest (`apps/mobile/src/test/setup.ts`)

**Build/Dev:**
- Vite 5.4.21 — dev server and production bundle for mobile (`apps/mobile/vite.config.ts`)
- `@vitejs/plugin-react` 4.3.1 — React Fast Refresh
- tsx 4.22.4 — backend dev watcher (`apps/backend/package.json` `dev` script)
- TypeScript compiler (`tsc`) — mobile type-check (`tsc --noEmit`) and backend build (`tsc` → `dist/`)

## Key Dependencies

**Critical (frontend — `apps/mobile/package.json`):**
- `@tanstack/react-query` 5.101.1 — server state for food analysis (`apps/mobile/src/features/analyze-food/model/useAnalyzeFood.ts`)
- `axios` 1.18.1 — HTTP client (`apps/mobile/src/shared/api/client.ts`)
- `zustand` 5.0.14 — client state: image selection, diary persistence (`apps/mobile/src/features/add-food/model/useImageStore.ts`, `apps/mobile/src/entities/meal/model/useDiaryStore.ts`)
- `react-router-dom` — SPA routing
- `sonner` 1.5.1 — toast notifications (`apps/mobile/src/app/providers.tsx`)

**Critical (backend — `apps/backend/package.json`):**
- `express` — HTTP server
- `cors` 2.8.5 — open CORS for local dev (`apps/backend/src/index.ts`)
- `multer` 1.4.5-lts.2 — multipart upload parsing (`apps/backend/src/routes/analyze-food.ts`)

**Shared workspace:**
- `@ai-food/shared-types` (`packages/shared-types/`) — cross-package TypeScript interfaces (`Meal`, `NutritionResult`, `AnalyzeFoodResponse`, `ApiError`); consumed by mobile and backend via `workspace:*`

**UI / styling:**
- Tailwind CSS 3.4.19 — utility-first styling (`apps/mobile/tailwind.config.ts`, `postcss.config.js`)
- `tailwindcss-animate` 1.0.7 — animation utilities
- shadcn/ui pattern — configured in `apps/mobile/components.json`; components live in `apps/mobile/src/shared/ui/` (Button, Card, Badge, Skeleton)
- `@radix-ui/react-slot` 1.1.0 — composable primitives (Button)
- `class-variance-authority` 0.7.0, `clsx` 2.1.1, `tailwind-merge` 2.4.0 — variant/class utilities (`apps/mobile/src/shared/lib/utils.ts`)
- `lucide-react` 0.408.0 — icons

**Infrastructure:**
- Not detected — no Docker, Kubernetes, cloud SDKs, or IaC in repo

## Configuration

**Environment:**
- Frontend API URL: `VITE_API_URL` read in `apps/mobile/src/shared/api/client.ts`; defaults to `http://localhost:3001`
- Backend port: `PORT` in `apps/backend/src/index.ts`; defaults to `3001`
- `.env` listed in `.gitignore` — file may exist locally; no `.env.example` committed
- No `.env.*` templates detected in repo

**Build:**
- Root: `package.json` — `pnpm dev`, `pnpm build`, `pnpm test`, `pnpm type-check` via Turbo
- `turbo.json` — pipeline for `build`, `dev`, `test`, `type-check`; `dev` is persistent and uncached
- `pnpm-workspace.yaml` — workspaces: `apps/*`, `packages/*`
- Mobile: `apps/mobile/vite.config.ts` — `@` → `./src`, dev port 5173
- Mobile: `apps/mobile/tsconfig.json` — strict mode, ESNext modules, path alias `@/*`
- Backend: `apps/backend/tsconfig.json` — CommonJS output to `dist/`, target ES2022
- Shared types: `packages/shared-types/tsconfig.json` — types-only package, no build step; exports raw `.ts` via `package.json` `exports`

**Linting / formatting:**
- Not detected — no ESLint, Prettier, or Biome config files

## Platform Requirements

**Development:**
- Node.js >= 18
- pnpm >= 9 (9.6.0 recommended via `packageManager` field)
- Run from repo root:
  ```bash
  pnpm install
  pnpm dev    # turbo dev — starts mobile (Vite :5173) and backend (:3001)
  ```
- Mobile-only: `pnpm --filter @ai-food/mobile dev`
- Backend-only: `pnpm --filter @ai-food/backend dev`

**Production:**
- Mobile: static SPA build via `pnpm --filter @ai-food/mobile build` → Vite `dist/` (standard Vite output; no deployment config in repo)
- Backend: `pnpm --filter @ai-food/backend build && pnpm --filter @ai-food/backend start` → Node runs `dist/index.js`
- No hosting platform, CI/CD, or container definitions detected

**Architecture note (design vs. implementation):**
- Design spec (`docs/superpowers/specs/2026-06-24-ai-food-mvp-design.md`) mentions Capacitor for native camera; Capacitor is **not** in `apps/mobile/package.json`. Camera/gallery use HTML `<input type="file">` in `apps/mobile/src/features/add-food/ui/ImagePicker.tsx`.

---

*Stack analysis: 2026-06-24*
