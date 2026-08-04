# Task 3 Report: In-memory Telegram login challenges

## Status
**Complete**

## Commits
- `feat(ai-app): add Telegram login challenge store`

## Files Created
- `apps/ai-app/src/lib/telegramLoginChallenge.ts`
- `apps/ai-app/src/lib/telegramLoginChallenge.test.ts`

## Tests
```
pnpm exec vitest run src/lib/telegramLoginChallenge.test.ts
✓ 3 passed (3)
```

| Test | Result |
|------|--------|
| create → confirm → consume → second consume null | PASS |
| rejects confirm for unknown nonce | PASS |
| expires pending challenges | PASS |

## TDD Flow
1. Wrote failing tests first — module not found (expected FAIL)
2. Implemented `telegramLoginChallenge.ts` per brief
3. Re-ran tests — all PASS

## Implementation Notes
- In-memory store with dual index: `byId` + `byNonce`
- Default TTL: 5 minutes
- Status lifecycle: `pending` → `confirmed` → `consumed`
- Expired/consumed challenges purged on access
- Expiry test uses `ttlMs: -1` (no spin wait) per brief recommendation

## Concerns
- In-memory only — challenges lost on process restart; acceptable for MVP per design spec
- No periodic cleanup of expired pending challenges; relies on lazy purge on access

## Next Task
Task 4: Telegram bot deep link + auth routes (consumes this module)
