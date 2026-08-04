<!-- generated-by: gsd-doc-writer -->
# Testing

## Test framework and setup

This project uses **Vitest** `^2` (`vitest` in `devDependencies`) with the Node environment.

Configuration lives in `vitest.config.ts`:

- `environment: 'node'`
- `globals: true`
- `include: ['src/**/*.test.ts', 'lib/**/*.test.ts']`

HTTP route and middleware tests use **supertest** (`^7.2.2`) against Express apps. External OpenAI/OpenRouter calls are mocked with `vi.mock('openai')` where needed.

No global test setup file is configured. Install dependencies once before running tests:

```bash
npm install
```

## Running tests

Full suite (CI-style, single run):

```bash
npm test
```

This runs `vitest run` and executes every file matching the `include` patterns above.

Run a single file:

```bash
npx vitest run src/routes/health.test.ts
```

Run tests matching a name pattern:

```bash
npx vitest run -t "requireApiKey"
```

Watch mode is not defined as an npm script; use Vitest directly if needed:

```bash
npx vitest
```

There are no `test:unit`, `test:integration`, or `test:e2e` scripts.

## Writing new tests

**Naming and location:** Colocate tests next to the code under test as `*.test.ts` under `src/` or `lib/`. Only those paths are picked up by Vitest. Files outside these globs (for example `api/gateway.test.ts`) are not part of the configured suite.

**Typical patterns in this repo:**

- Import `describe`, `it`, `expect`, `vi`, `beforeEach`, and `afterEach` from `vitest` (even though `globals` is enabled).
- Use `request(app)` from `supertest` for HTTP assertions.
- Build small Express apps inline for middleware unit tests (see `appWithAuth` in `src/middleware/auth.test.ts`, `buildApp` in `src/middleware/error.test.ts`).
- For gateway integration-style tests, call `createApp()` from `src/app.ts` and mock the OpenAI client.
- Save and restore `process.env` values (`API_KEY`, `OPENROUTER_API_KEY`) in `beforeEach` / `afterEach` so env mutations do not leak between cases.

There is no shared `tests/helpers` module; helpers are local to each test file.

## Coverage requirements

No coverage threshold configured. Vitest coverage (`coverageThreshold`, `c8`, `.nycrc`) is not set up in this repository.

## CI integration

No CI/CD pipeline detected. There is no `.github/workflows/` directory, so tests are not automatically run on push or pull request. Run `npm test` locally before merging changes.
