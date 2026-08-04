# Task 4 Report: Chat completions (JSON + SSE)

## Status: DONE

## TDD Evidence

### RED

`npx vitest run src/app.test.ts` failed as expected: all four new chat tests received `404` before the route existed (6 passed, 4 failed).

### GREEN

`npx vitest run src/app.test.ts` passed all 10 tests after implementation.

### Full suite

`npm test` passed all 24 tests across 5 files.

## Implementation

- Added `src/routes/chat.ts` with Zod request validation and OpenAI-compatible JSON responses.
- Added SSE streaming with `text/event-stream`, JSON `data:` chunks, `[DONE]`, 120-second stream creation timeout, and disconnect abort handling.
- Streaming holds the shared concurrency slot through `runOpenAIHeld` until completion or disconnect.
- Upstream errors are mapped through `mapOpenAIError`; errors after headers are sent terminate the response without a JSON error.
- Mounted the router at `/v1/chat/completions` after API-key middleware and preserved the 404/error-handler order.
- Extended `src/app.test.ts` without removing prior coverage; moved the unmatched `/v1` assertion to `/v1/no-such-route`.

## Commit

`02d4aa1 feat: add chat completions route with SSE streaming`

## Verification

- `npx vitest run src/app.test.ts` — 10/10 passed
- `npm test` — 24/24 passed
- IDE lint diagnostics — no errors in changed files
- `npm run type-check` — blocked by pre-existing legacy imports of removed `apiErrorResponse` in `lib/auth.ts` and `lib/request.ts`; no Task 4 diagnostics were reported

## Concerns

The repository-wide type check remains red on the known legacy `lib/auth.ts` and `lib/request.ts` errors expected to be addressed by a later migration task.

## Remaining Important finding

- Added a pre-create disconnect guard after the held concurrency slot is acquired.
- A queued request that disconnected now aborts its create signal, releases the slot, and returns without starting an upstream chat completion.
- Added a real HTTP regression test that fills all five held slots, disconnects a queued stream, and verifies the next upstream call belongs to a live queued probe.

### Final review verification

- RED: focused regression test failed because the first post-release upstream call used model `queued-disconnect`.
- GREEN: focused regression test passed (1/1) after the early disconnect guard.
- `npx vitest run src/app.test.ts` — 12/12 passed.
- `npm test` — 26/26 passed across 5 files.
- IDE lint diagnostics — no errors in changed files.

## Important review fixes

- Registered request-abort and response-close handlers before awaiting stream creation.
- Added an `AbortSignal` so disconnects cancel an in-flight upstream `create()` and release the held concurrency slot immediately.
- Added a post-create disconnect guard that aborts a late-resolving stream and returns without writing headers or SSE data.
- Added a real HTTP regression test that disconnects while `create()` is pending and verifies both request-signal and resolved-stream aborts.

### Review verification

- RED: focused regression test failed with `expected undefined to be true` before the lifecycle fix.
- GREEN: focused regression test passed (1/1).
- `npx vitest run src/app.test.ts` — 11/11 passed.
- `npm test` — 25/25 passed across 5 files.
- IDE lint diagnostics — no errors in changed files.
- `npm run type-check` — only the two pre-existing legacy `apiErrorResponse` import errors remain in `lib/auth.ts` and `lib/request.ts`; no Task 4 diagnostics.

## Concurrency release on pending-create disconnect

- Strengthened `aborts a stream request disconnected while create is pending` to fill four held concurrency slots, disconnect a fifth stream during pending `create()`, and assert a probe non-stream request calls `createChat` before resolving the disconnected create promise.
- No implementation change required; existing `onDisconnect` → `release()` behavior passes the strengthened regression.
- `npx vitest run src/app.test.ts` — 12/12 passed.
- `npm test` — 26/26 passed across 5 files.
