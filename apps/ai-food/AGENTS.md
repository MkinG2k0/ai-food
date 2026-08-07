# AI Food — agent notes

Frontend nutrition diary (`apps/ai-food`). AI backend is the sibling package:

- Path: `apps/ai-app` (`openrouter-gateway` → OpenRouter)
- Contract: `docs/AI-GATEWAY.md`
- Cursor rules (workspace root): `.cursor/rules/ai-gateway.mdc`, `.cursor/rules/index-reexports.mdc`
- Integrations map: `.planning/codebase/INTEGRATIONS.md`

Do not assume an in-repo Express `/analyze-food` server.

## Env

- Client: `apps/ai-food/.env` — only `VITE_*` (web / `pnpm dev`)
- Capacitor APK: `apps/ai-food/.env.mobile` — overrides for `pnpm cap:build` (`vite --mode mobile`); template `.env.mobile.example`
- Gateway: `apps/ai-app/.env` — server secrets (`OPENROUTER_API_KEY`, `API_KEY`, `DATABASE_URL`, …)
