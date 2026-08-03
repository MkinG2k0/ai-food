# Technology Stack

**Analysis Date:** 2026-08-03

## Languages

**Primary:**
- TypeScript 5.9.3 (resolved via `pnpm-lock.yaml`) — application code in `src/`
- TSX/JSX — React components in `src/**/*.tsx`

**Secondary:**
- HTML — `index.html` (Vite entry shell)
- CSS — `src/app/styles/global.css` (Tailwind directives + CSS variables for shadcn/ui)
- JSON — `package.json`, `components.json`

## Runtime

**Environment:**
- Node.js >= 18 (declared in root `package.json` `engines`)
- Browser (Chromium/WebKit) — Vite SPA; Capacitor Android shell for native builds

**Package Manager:**
- pnpm 9.6.0 (pinned in root `package.json` `packageManager`)
- Lockfile: present (`pnpm-lock.yaml`)
- Single package — no pnpm workspaces / Turborepo

## Frameworks

**Core:**
- React 18.3.1 — UI in `src/`
- React Router DOM 6.24.1 — routing in `src/app/router.tsx`

**Testing:**
- Vitest 2.1.9 — unit tests (`vitest.config.ts`)
- Testing Library (`@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`)
- jsdom — DOM environment for Vitest (`src/test/setup.ts`)

**Build/Dev:**
- Vite 5.4.21 — dev server and production bundle (`vite.config.ts`)
- `@vitejs/plugin-react` — React Fast Refresh
- TypeScript compiler (`tsc`) — `type-check` / build (`tsc && vite build`)
- Capacitor 8 — native Android (`android/`, `capacitor.config.ts`)

## Key Dependencies

**Critical:**
- `@tanstack/react-query` — server/async state for food analysis
- `axios` — HTTP client (`src/shared/api/client.ts`)
- `zustand` — client state: image selection, diary, profile, settings
- `react-router-dom` — SPA routing
- `sonner` — toast notifications (`src/app/providers.tsx`)
- Domain types in `src/shared/types` (import alias `@ai-food/shared-types`)

**UI / styling:**
- Tailwind CSS + `tailwindcss-animate`
- shadcn/ui pattern — `components.json`; components in `src/shared/ui/`
- `@radix-ui/react-slot`, `class-variance-authority`, `clsx`, `tailwind-merge`
- `lucide-react` — icons
- `framer-motion` — motion / week strip

**Native / storage:**
- `@capacitor/core`, `@capacitor/android`, `@capacitor/app`
- `@capacitor/camera`, `@capacitor/filesystem`, `@capacitor/preferences`

**Infrastructure:**
- Not detected — no Docker, Kubernetes, cloud SDKs, or IaC in repo

## Configuration

**Environment:**
- AI Gateway: `VITE_AI_GATEWAY_URL`, `VITE_AI_GATEWAY_API_KEY` (client-side)
- Optional `VITE_API_URL` in `src/shared/api/client.ts`
- `.env` listed in `.gitignore` — may exist locally; no `.env.example` committed

**Build:**
- Root `package.json` scripts: `pnpm dev`, `pnpm build`, `pnpm test`, `pnpm type-check`
- Capacitor: `pnpm cap:sync`, `pnpm cap:build`, `pnpm cap:open:android`
- `vite.config.ts` — `@` → `./src`, `@ai-food/shared-types` → `./src/shared/types`
- `tsconfig.json` — strict mode, path aliases `@/*` and `@ai-food/shared-types`

**Linting / formatting:**
- Not detected — no ESLint, Prettier, or Biome config files

## Platform Requirements

**Development:**
- Node.js >= 18
- pnpm >= 9 (9.6.0 recommended via `packageManager` field)
- Run from repo root:
  ```bash
  pnpm install
  pnpm dev    # Vite :5173
  ```

**Production:**
- Static SPA build via `pnpm build` → Vite `dist/`
- Native: `pnpm cap:build` then open Android Studio
- No hosting platform, CI/CD, or container definitions detected

---

*Stack analysis: 2026-08-03 (single-package repo)*
