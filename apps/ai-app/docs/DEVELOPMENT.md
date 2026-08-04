<!-- generated-by: gsd-doc-writer -->
# Development

Local development guide for **openrouter-gateway** — an Express HTTP proxy to OpenRouter.

## Local setup

1. Clone the repository and enter the project directory:
   ```bash
   git clone https://github.com/MkinG2k0/ai-app.git
   cd ai-app
   ```
2. Install dependencies (use `npm install` for day-to-day development):
   ```bash
   npm install
   ```
3. Create a local env file from the example and set at least `OPENROUTER_API_KEY`:
   ```bash
   cp .env.example .env
   ```
4. Start the dev server (loads `.env` via `tsx --env-file=.env` and watches for changes):
   ```bash
   npm run dev
   ```

The server listens on `http://0.0.0.0:3000` (or `PORT` from `.env`). No separate build step is required before running — TypeScript is executed directly with `tsx`. See [CONFIGURATION.md](CONFIGURATION.md) for all environment variables.

Source layout for day-to-day work:

```
src/                 # Express entry, app factory, middleware, routes
  server.ts          # Process bootstrap
  app.ts             # createApp() and route mounting
  middleware/        # auth, error handling
  routes/            # health, models, embeddings, chat
lib/                 # Shared helpers (OpenRouter client, queue, errors, types)
```

`tsconfig.json` targets ES2022 with `module`/`moduleResolution` `NodeNext`, `strict: true`, and `noEmit: true`. It includes `src` and `lib`, and excludes `**/*.test.ts`.

## Build commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server with hot reload: `tsx watch --env-file=.env src/server.ts` |
| `npm start` | Production-style run: `tsx src/server.ts` (does **not** load `.env` automatically — set env in the process) |
| `npm test` | Run the Vitest suite once (`vitest run`) |
| `npm run type-check` | TypeScript check without emit (`tsc --noEmit`) |

There is no `build`, `lint`, or `format` script. Runtime is TypeScript via `tsx`; type safety is enforced with `type-check` and editor/`tsc` feedback.

## Code style

- **Language:** TypeScript (`"type": "module"` in `package.json`), ESM imports, Express routers under `src/`, shared logic under `lib/`.
- **Compiler:** `tsconfig.json` — `strict: true`, `isolatedModules: true`, `skipLibCheck: true`. Prefer typed handlers and Zod schemas at route boundaries (see chat/embeddings routes).
- **Lint / format:** No ESLint, Prettier, Biome, or `.editorconfig` is configured in this repository. Match existing file style (imports, naming, error envelope via `lib/errors.ts`).
- **Types:** Before opening a PR, run `npm run type-check`. Tests live next to sources as `*.test.ts` under `src/` and `lib/` (see `vitest.config.ts`).

## Branch conventions

Default branch: `main`.

No branch naming convention is documented in the repository (no `CONTRIBUTING.md` or `.github/PULL_REQUEST_TEMPLATE.md`). Recent history uses short topic branches merged into `main`. A practical pattern aligned with recent commits:

- `feat/<short-description>` — new endpoints or behavior
- `fix/<short-description>` — bug fixes
- `chore/<short-description>` — tooling, cleanup, docs-only churn

## PR process

No pull-request template or GitHub Actions workflows are present in the repo. Suggested checklist based on project scripts and commit history:

- Branch from `main` and keep the change focused on one concern.
- Prefer conventional-style commit messages as used in history (`feat:`, `fix:`, `chore:`, `test:`, `docs:`).
- Run `npm run type-check` and `npm test` locally before requesting review.
- Document new or changed env vars in `.env.example` and [CONFIGURATION.md](CONFIGURATION.md).
- Open a PR against `main` on [github.com/MkinG2k0/ai-app](https://github.com/MkinG2k0/ai-app); describe behavior changes and how you verified them (curl examples or test names).
