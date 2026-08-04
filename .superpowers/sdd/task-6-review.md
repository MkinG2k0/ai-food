# Task 6 Review: Scaffold `apps/ai-web` (Next.js + Ant Design)

**Reviewer:** task-scoped gate  
**Base:** `4b32edb297ae0de57c648800e0c3b955d3296914`  
**Head:** `3fe72f37200df98a9afd6a5e61b19f7b29b6beea` — `feat(ai-web): scaffold Next.js app with Ant Design for admin/landing`  
**Brief:** `.superpowers/sdd/task-6-brief.md`  
**Report:** `.superpowers/sdd/task-6-report.md`

---

## Verdict

| Gate | Result |
|------|--------|
| **Spec** | ✅ |
| **Quality** | ✅ |
| **Critical** | 0 |
| **Important** | 0 |
| **Minor** | 2 |

## 1. Spec compliance: ✅

| Requirement | Verdict | Evidence |
|-------------|---------|----------|
| Package name `ai-web` | ✅ | `apps/ai-web/package.json` L2 |
| Dev/start port **3001** | ✅ | `package.json` scripts `dev` / `start` |
| Next 15 + React 18 + Ant Design stack | ✅ | Dependencies: `next@^15.2.0`, `react@^18.3.1`, `antd`, `@ant-design/nextjs-registry`, `@ant-design/icons` |
| Also: TanStack Query, `jose`, TypeScript | ✅ | Declared in `package.json`; wiring deferred to later tasks (acceptable for scaffold) |
| Root layout with `AntdRegistry`, `lang="ru"` | ✅ | `src/app/layout.tsx` |
| Landing stub at `/`: **AI Food** + «Скоро», no Ant Layout chrome | ✅ | `src/app/page.tsx`; plain `<main>` + CSS |
| `.env.example` with server-only vars | ✅ | `apps/ai-web/.env.example` — `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `ADMIN_API_KEY`, `AI_GATEWAY_URL` |
| `.env` not committed | ✅ | Commit tree lists only `apps/ai-web/.env.example`; `.gitignore` ignores `/.env` |
| Monorepo scripts `dev:web` / `build:web` | ✅ | Root `package.json` |
| Turbo: `.next/**` output + server env passthrough | ✅ | `turbo.json` — `outputs`, `passThroughEnv` for `ADMIN_*` / `AI_GATEWAY_URL` |
| `pnpm install` + `type-check` pass | ✅ | Re-run: both PASS |
| UI kit Ant Design (not shadcn) | ✅ | No shadcn/radix in `apps/ai-web` |
| No Capacitor | ✅ | No Capacitor deps or references |
| `/` only (no `/admin/*` yet) | ✅ | App Router has `page.tsx` at root only |
| Browser never sees `ADMIN_API_KEY` | ✅ | No `NEXT_PUBLIC_*`; no client usage; grep of `.next` build — no `ADMIN_*` strings |

Global constraints satisfied. Commit scope matches brief Step 8 (scaffold files + root `package.json` + `turbo.json` + lockfile; no unrelated app changes).

## 2. Task quality: ✅

### Critical

_None._

### Important

_None._

### Minor

1. **`jose` and `@tanstack/react-query` are declared but not yet imported.** Expected for a scaffold; later admin/auth tasks should wire `QueryClientProvider` and session helpers.
2. **`task-6-report.md` prints `ADMIN_PASSWORD` in plaintext** (L33). Not in the git commit, but the handoff artifact should avoid persisting live secrets — terminal-only delivery is enough.

## Verification

- Read brief, report, and diff `4b32edb..3fe72f3`.
- Confirmed commit file list: 12 files; no `apps/ai-web/.env` or `apps/ai-app/.env`.
- `pnpm --filter ai-web type-check` — **PASS**
- `pnpm --filter ai-web build` — **PASS**; `/` prerendered as static (123 B page, 102 kB First Load JS)
- Grep `apps/ai-web` for `shadcn`, `capacitor`, `NEXT_PUBLIC`, client `ADMIN_API_KEY` — **none**

## Summary

Scaffold meets the spec: new `ai-web` Next.js 15 package on port 3001, Ant Design registry in root layout, minimal Russian landing at `/`, monorepo wiring, Turbo build output and server-only env passthrough, `.env.example` committed with secrets left local. No `.env` leakage, no forbidden UI stack, no premature admin routes. Quality gate passes with only minor forward-compatibility and report-hygiene notes.
