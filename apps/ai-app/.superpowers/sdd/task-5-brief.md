### Task 5: Remove Vercel artifacts + update docs + final verify

**Files:**
- Delete: `api/health.ts`, `api/v1/models.ts`, `api/v1/chat/completions.ts`, `api/v1/embeddings.ts`, `api/gateway.test.ts`, `vercel.json`, `lib/cors.ts`, `lib/request.ts`, empty `api/` dirs, `public/.gitkeep` if unused
- Modify: `README.md` вЂ” Express scripts, remove Vercel sections, local URL stays `localhost:3000`, structure tree for `src/`
- Modify: `.env.example` вЂ” add optional `PORT=3000`
- Modify: `.gitignore` вЂ” can keep `.vercel/` harmless or remove line
- Test: full suite + type-check

**Interfaces:** none new

- [ ] **Step 1: Delete Vercel / Fetch-only files**

Delete:

- `api/` (entire tree)
- `vercel.json`
- `lib/cors.ts`
- `lib/request.ts`

- [ ] **Step 2: Update `.env.example`**

```
OPENROUTER_API_KEY=your_key_here
# Optional attribution headers for openrouter.ai (shown in their dashboard/rankings).
# OPENROUTER_HTTP_REFERER=https://your-app.example.com
# OPENROUTER_APP_TITLE=Your App Name
# Optional shared secret for caller apps. Omit to disable gateway auth.
# API_KEY=your_gateway_secret
# PORT=3000
```

- [ ] **Step 3: Rewrite README for Express**

Key replacements:

- Title blurb: вЂњHTTP-СЃРµСЂРІРёСЃ-РїСЂРѕРєСЃРё Рє OpenRouter РЅР° ExpressвЂќ (not Vercel Functions)
- `npm run dev` в†’ tsx watch; remove `deploy`
- Remove Vercel Project Settings / Framework Preset / Hobby limits paragraphs about Vercel body size
- Structure tree в†’ `src/` layout from spec
- Keep curl examples and error table (URLs unchanged)
- Example fetch URL: `http://localhost:3000/...` (not `*.vercel.app`) вЂ” mention self-host base URL

- [ ] **Step 4: Run full verification**

Run:

```bash
npm test
npm run type-check
```

Expected: both succeed; no references to `vercel` in `package.json`.

Optional smoke (if `.env` has key):

```bash
npm run dev
# other terminal:
curl http://localhost:3000/health
```

Expected: `{"status":"ok"}`

- [ ] **Step 5: Grep for leftover Vercel / Web Response helpers**

Run: search repo for `vercel`, `apiErrorResponse`, `handleCorsPreflight`, `readJsonBody`

Expected: no matches in source (docs/history under `.planning/` may remain вЂ” leave those)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove Vercel and document Express gateway"
```

---
