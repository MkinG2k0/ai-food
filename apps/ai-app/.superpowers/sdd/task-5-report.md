# Task 5 Report: Remove Vercel artifacts + update docs + final verify

## Status: DONE

## Deleted

- `api/` tree (health, models, chat/completions, embeddings, gateway.test.ts)
- `vercel.json`
- `lib/cors.ts`, `lib/request.ts`, `lib/auth.ts`
- `public/.gitkeep` (unused)

Kept: `lib/openai.ts`, `lib/queue.ts`, `lib/errors.ts`, `lib/types.ts`, `lib/queue.test.ts`

## Updated

- `README.md` — Express title, scripts (`dev`/`start`), `src/` structure tree, self-host base URL, removed Vercel deploy/settings/Hobby limits
- `.env.example` — added optional `PORT=3000`

## Commit

`8c225b7 chore: remove Vercel and document Express gateway`

## Verification

- `npm test` — 26/26 passed (5 files)
- `npm run type-check` — clean (no errors)
- Grep `vercel|apiErrorResponse|handleCorsPreflight|readJsonBody` in `*.{ts,tsx,js,json}` — no matches
- `package.json` — no Vercel references

## Concerns

- `.gitignore` still has harmless `.vercel/` entry (brief allows keeping)
- Empty `api/` and `public/` dirs may remain on disk until manually removed; git no longer tracks them
- Smoke test (`npm run dev` + curl `/health`) not run — no `.env` key verified in this session
