---
phase: 260716-iun-openai-5
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/queue.ts
  - lib/openai.ts
  - lib/queue.test.ts
  - api/v1/chat/completions.ts
  - api/v1/embeddings.ts
  - api/v1/models.ts
autonomous: true
requirements:
  - POOL-01
tags:
  - concurrency
  - openai
  - vercel

must_haves:
  truths:
    - "At most 5 OpenAI upstream calls run concurrently inside one isolate"
    - "A 6th concurrent call waits until a slot frees, then runs (not rejected, not serialized to 1)"
    - "chat.completions, embeddings.create, and models.list all acquire the same shared pool"
    - "Public HTTP contracts of /v1/* routes stay unchanged"
    - "No new npm dependency for the pool"
  artifacts:
    - path: "lib/queue.ts"
      provides: "In-process semaphore / concurrency pool (limit 5)"
    - path: "lib/openai.ts"
      provides: "runOpenAI() wrapper that acquires the pool around upstream work"
    - path: "lib/queue.test.ts"
      provides: "Unit proof that concurrency never exceeds 5"
  key_links:
    - from: "api/v1/chat/completions.ts"
      to: "lib/openai.ts"
      via: "runOpenAI(() => client.chat.completions.create(...))"
    - from: "api/v1/embeddings.ts"
      to: "lib/openai.ts"
      via: "runOpenAI(() => client.embeddings.create(...))"
    - from: "api/v1/models.ts"
      to: "lib/openai.ts"
      via: "runOpenAI(() => client.models.list())"
    - from: "lib/openai.ts"
      to: "lib/queue.ts"
      via: "shared singleton pool limit=5"
---

<objective>
Add an in-process concurrency pool so at most 5 OpenAI upstream calls run in parallel per Vercel isolate (D-01, D-02), wrapping only OpenAI call sites — not body parsing (D-03).

Purpose: Protect the upstream OpenAI account from burst parallelism when multiple gateway invocations share an isolate, without changing the public API.

Output: `lib/queue.ts` semaphore, `runOpenAI` in `lib/openai.ts`, all three v1 handlers wired through it, unit tests proving the limit.
</objective>

<execution_context>
@$HOME/.cursor/gsd-core/workflows/execute-plan.md
@$HOME/.cursor/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@lib/openai.ts
@lib/errors.ts
@api/v1/chat/completions.ts
@api/v1/embeddings.ts
@api/v1/models.ts
@api/gateway.test.ts
@package.json
</context>

<notes>
**Vercel serverless caveat:** the pool is in-memory module state. It limits concurrency **within a single isolate/instance**, not across all cold/warm instances region-wide. That is acceptable for this quick task; a global queue would need Redis/Upstash and is out of scope.

**Do not** put the pool in `lib/request.ts` (JSON body parsing only) — per D-03.
**Do not** add p-limit / bottleneck / similar packages — a ~20-line semaphore is enough.
**Do not** change route auth, Zod schemas, CORS, or response shapes.
</notes>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Semaphore + runOpenAI wrapper</name>
  <files>lib/queue.ts, lib/openai.ts, lib/queue.test.ts</files>
  <behavior>
    - createLimiter(5): starting 6 deferred async jobs with controlled resolve — peak in-flight count is exactly 5; the 6th starts only after one finishes
    - Errors from the wrapped fn propagate; the slot is released even when fn rejects (finally)
    - createLimiter(1) allows only one at a time (sanity); production constant for OpenAI is 5 per D-02
    - runOpenAI(fn) calls fn(getOpenAIClient()) only while holding a pool slot
  </behavior>
  <action>
  Implement an in-process concurrency pool and expose it for OpenAI upstream work (D-01, D-02, D-03).

  1. Create `lib/queue.ts` exporting something like `createLimiter(concurrency: number)` returning `{ run&lt;T&gt;(fn: () =&gt; Promise&lt;T&gt;): Promise&lt;T&gt; }` (names may vary; keep API tiny). Behavior: FIFO waiters; acquire before running `fn`; release in `finally` so rejections free the slot; never drop callers — waiters resolve when a slot opens. Default OpenAI limit constant `OPENAI_CONCURRENCY = 5` (export it for tests). This is a **pool of 5**, not a serial queue of 1 (D-01, D-02).

  2. In `lib/openai.ts`: keep `getOpenAIClient()` as-is for constructing the client. Add a module-level singleton limiter with limit 5 and export `runOpenAI&lt;T&gt;(fn: (client: OpenAI) =&gt; Promise&lt;T&gt;): Promise&lt;T&gt;` that does `limiter.run(() =&gt; fn(getOpenAIClient()))`. All OpenAI network work must go through `runOpenAI` (D-03) — handlers will be updated in Task 2.

  3. Create `lib/queue.test.ts` (vitest) that proves peak concurrency ≤ 5 with synthetic delayed promises (no real OpenAI). Also assert slot release on rejection. Do not add npm dependencies.

  Avoid touching `lib/request.ts`. Avoid changing env vars or package.json scripts beyond what tests already use (`vitest run`).
  </action>
  <verify>
    <automated>npm test -- lib/queue.test.ts</automated>
  </verify>
  <done>
    `lib/queue.ts` and `runOpenAI` exist; unit tests pass proving max 5 in-flight and release-on-error; no new dependencies.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Wire v1 handlers through runOpenAI</name>
  <files>api/v1/chat/completions.ts, api/v1/embeddings.ts, api/v1/models.ts</files>
  <action>
  Route every upstream OpenAI call through the shared pool (D-03) without changing public HTTP behavior.

  1. `api/v1/chat/completions.ts`: replace direct `getOpenAIClient().chat.completions.create(params)` with `runOpenAI((client) =&gt; client.chat.completions.create(params))`. Keep auth, Zod, stream rejection, and `mapOpenAIError` catch block unchanged.

  2. `api/v1/embeddings.ts`: wrap `embeddings.create(...)` the same way via `runOpenAI`.

  3. `api/v1/models.ts`: wrap `models.list()` via `runOpenAI`.

  Import `runOpenAI` from `lib/openai.js` (same `.js` extension style as existing imports). Remove unused `getOpenAIClient` imports from handlers if no longer referenced. Do not wrap body parsing or auth. Existing `api/gateway.test.ts` mocks of the OpenAI constructor must keep passing — `runOpenAI` still uses `getOpenAIClient()` under the pool.
  </action>
  <verify>
    <automated>npm test -- api/gateway.test.ts</automated>
  </verify>
  <done>
    All three handlers use `runOpenAI` for upstream calls; gateway integration tests still pass; route contracts unchanged.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Client → gateway handlers | Untrusted HTTP; auth/Zod already gate input |
| Gateway → OpenAI API | Trusted outbound with server-side `OPENAI_API_KEY` |
| Module isolate memory | Shared pool state within one Vercel isolate |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-260716-01 | Denial of Service | lib/queue.ts waiters | medium | accept | Unbounded waiter queue can grow under load within an isolate; acceptable for quick task — callers already hit Vercel request timeouts; no reject-on-full unless user asks later |
| T-260716-02 | Information Disclosure | error paths | low | mitigate | Keep existing `mapOpenAIError`; pool must not alter error mapping or leak secrets |
| T-260716-03 | Elevation of Privilege | N/A | low | accept | Pool does not change auth; `requireApiKey` remains on protected routes |
| T-260716-SC | Tampering | npm installs | high | mitigate | No new packages — hand-rolled semaphore only |
</threat_model>

<verification>
- `npm test -- lib/queue.test.ts` proves concurrency ≤ 5 and release on reject
- `npm test -- api/gateway.test.ts` proves routes still work through `runOpenAI`
- `npm run type-check` clean
- Grep: handlers no longer call `.chat.completions.create` / `.embeddings.create` / `.models.list` outside `runOpenAI`
</verification>

<success_criteria>
- Shared in-process pool limit is 5 (D-02)
- Behavior is parallel-with-cap, not serial-one-at-a-time (D-01)
- Pool wraps OpenAI calls only, not `lib/request.ts` (D-03)
- Public `/v1/*` API unchanged; tests green; no new deps
</success_criteria>

<output>
Create `.planning/quick/260716-iun-openai-5/260716-iun-SUMMARY.md` when done
</output>
