# Mobile env for Capacitor builds

**Date:** 2026-08-07  
**Status:** implemented  
**Package:** `apps/ai-food`

## Problem

Web/dev uses `apps/ai-food/.env` with a local gateway (`http://127.0.0.1:3000`). Capacitor APK builds run the same `vite build` (mode `production`) and therefore bake the same local URL into the native WebView — the device cannot reach the host loopback.

## Goal

- **Web / `pnpm dev`:** keep current `.env` (local gateway).
- **Capacitor APK (`cap:build`):** bake **prod gateway** URL/key from a dedicated env file.
- Do **not** change web production / Dokploy build env as part of this change.

## Decision

Use Vite **`--mode mobile`** with `.env.mobile` overrides (approach A).

Rejected:

- **B** — put prod gateway in `.env.production`: would also affect any web `vite build` that uses default production mode.
- **C** — copy/swap `.env` before build: fragile, easy to leave the wrong file in place.

## Env loading

Vite load order for `vite build --mode mobile`:

1. `.env`
2. `.env.local` (if present)
3. `.env.mobile`
4. `.env.mobile.local` (if present)

Later files override earlier for the same key. Shared non-secret defaults can stay in `.env`; mobile only needs to override gateway (and optionally app URL / auth mock).

## Files

| File | Git | Role |
|------|-----|------|
| `.env` | no (already ignored) | Local web/dev |
| `.env.mobile` | **no** (add to `.gitignore`) | Capacitor build overrides — secrets/values |
| `.env.mobile.example` | **yes** | Template without secrets |
| `.env.example` | yes | Short note pointing at mobile mode |

### Required keys in `.env.mobile` / example

Same `VITE_*` contract as web:

- `VITE_AI_GATEWAY_URL` — deployed gateway origin (no `/v1` suffix)
- `VITE_AI_GATEWAY_API_KEY` — client gateway key (maps to gateway `API_KEY`)

Optional overrides (document in example, leave commented if unused):

- `VITE_APP_URL`
- `VITE_AUTH_MOCK` (typically `false` for store builds)
- `VITE_TELEGRAM_BOT_USERNAME`
- `VITE_LEGAL_SITE_URL`

No server secrets (`OPENROUTER_*`, `DATABASE_URL`, …) — those stay in `apps/ai-app/.env` only.

## Scripts (`apps/ai-food/package.json`)

| Script | Command |
|--------|---------|
| `build:mobile` | `tsc && vite build --mode mobile` |
| `cap:build` | `npm run build:mobile && npm run cap:sync` |

`build` (web) stays `tsc && vite build` (default `production` mode) — unchanged.

Root turbo scripts need no change unless a dedicated `build:food:mobile` is desired later (out of scope).

## Docs

- `docs/AI-GATEWAY.md` — add a short subsection: Capacitor uses `--mode mobile` / `.env.mobile`.
- `AGENTS.md` Env bullet — mention `.env.mobile` for native builds.

## Out of scope

- LAN IP / device-debug mode (second mobile-dev file)
- Changing Dokploy / Vercel web build env
- Moving `VITE_AI_GATEWAY_API_KEY` off the client
- iOS-specific env (same `.env.mobile` applies when iOS is used)

## Success criteria

1. `pnpm dev` / `pnpm build` still resolve gateway from `.env` / production mode as today.
2. `pnpm cap:build` (or `build:mobile`) embeds values from `.env.mobile`.
3. `.env.mobile` is gitignored; `.env.mobile.example` is committed and documents required keys.
4. Docs mention the split so a new developer does not bake localhost into an APK by mistake.
