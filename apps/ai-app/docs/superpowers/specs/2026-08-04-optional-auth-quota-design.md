# Optional Telegram Auth + Free Generation Quota

**Date:** 2026-08-04  
**Status:** Approved (conversation) — awaiting spec file review  
**Repos:** `ai-app` (gateway) primary; `ai-food` client wiring  
**Approach:** A — quota + identity on gateway (Prisma/Postgres), not client-only counting

## Goal

Allow guests to use the app without Telegram login, with a free budget of **50** paid AI generations (`analyze` + `refine`). After the budget is exhausted, the user must sign in with Telegram to continue. Subscription purchase is **future**; for MVP, a valid Telegram session removes the guest limit. Settings shows remaining free generations.

Existing gateway `API_KEY` auth for `/v1/*` stays unchanged and orthogonal to user identity.

## Non-goals (this phase)

- Payment / Store subscriptions / Stripe
- Full Auth.js (`@auth/express`) cookie/OIDC stack (can migrate later)
- Counting onboarding / micronutrient / custom-content / embeddings / models toward the free limit
- Hard paywall after login
- Multi-device merge of guest quotas beyond optional link-on-login

## Product rules

| Actor | Analyze / refine | Other `/v1/chat/completions` |
|-------|------------------|------------------------------|
| Guest (`X-Device-Id`, no user JWT) | Count toward 50; block at limit with `402` | No quota |
| Authenticated (valid user JWT) | Unlimited (until subscription ships) | No quota |
| Missing `X-Device-Id` on billable call (guest) | `400` with clear code | — |

Settings UI:

- Guest: «Осталось N из 50»
- Logged in: «Безлимит» (or hide numeric free counter)

## Architecture

```mermaid
sequenceDiagram
  participant App as ai-food
  participant Cap as Capacitor Preferences
  participant GW as ai-app gateway
  participant DB as Postgres (Prisma)
  participant TG as Telegram Login Widget

  App->>Cap: getOrCreate deviceId
  App->>GW: POST /v1/chat/completions<br/>X-API-Key + X-Device-Id<br/>X-Usage-Kind: analyze|refine
  GW->>DB: ensure Device, check/increment usage
  alt guest over limit
    GW-->>App: 402 QUOTA_EXCEEDED
    App-->>App: toast + /login
  else ok
    GW-->>App: upstream OpenRouter response
  end

  App->>TG: Login Widget (domain vercel)
  TG-->>App: auth payload
  App->>GW: POST /auth/telegram
  GW->>GW: verify HMAC with TELEGRAM_BOT_TOKEN
  GW->>DB: upsert User, optional link Device
  GW-->>App: { token, user }
  App->>App: persist JWT; Settings shows unlimited
```

## Data model (Prisma / Postgres)

```prisma
enum SubscriptionStatus {
  none
  active
  canceled
  past_due
}

model User {
  id                 String             @id @default(cuid())
  telegramId         String             @unique
  username           String?
  firstName          String?
  lastName           String?
  photoUrl           String?
  subscriptionStatus SubscriptionStatus @default(none)
  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt
  devices            Device[]
  usageEvents        UsageEvent[]
}

model Device {
  id        String   @id @default(cuid())
  deviceId  String   @unique // client-stable UUID from Capacitor
  userId    String?
  user      User?    @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  usageEvents UsageEvent[]
}

model UsageEvent {
  id        String   @id @default(cuid())
  kind      String   // "analyze" | "refine"
  deviceId  String
  device    Device   @relation(fields: [deviceId], references: [id])
  userId    String?
  user      User?    @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())

  @@index([deviceId, kind])
  @@index([userId, kind])
}
```

**Quota accounting:** for guests, `remaining = FREE_GENERATION_LIMIT - count(UsageEvent where device = X and kind in analyze|refine)`. Authenticated requests skip guest quota (still may record events for analytics — optional in MVP; prefer record with `userId` for future billing).

**Concurrency:** increment only after request accepted for upstream (or use transactional check-then-insert before calling OpenRouter to avoid free overage on failures — prefer **reserve before upstream**, roll back / do not count on upstream hard failure if easy; MVP: count on accepted gateway attempt after validation passes).

Recommended MVP: **check remaining → if ok call OpenRouter → on HTTP 2xx from handler start (or successful non-stream / stream open) write UsageEvent**. Document that failed AI calls may or may not consume — choose **consume only when OpenRouter call is initiated successfully** (slot acquired) to limit abuse while not punishing validation errors.

## Backend API (`ai-app`)

### Env

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `DATABASE_URL` | Yes for auth/quota | — | Postgres URL (user fills later) |
| `AUTH_SECRET` | Yes for JWT | — | HS256 secret ≥32 chars |
| `TELEGRAM_BOT_TOKEN` | Yes for real login | — | BotFather token (server only) |
| `FREE_GENERATION_LIMIT` | No | `50` | Guest analyze+refine cap |
| `API_KEY` | existing | — | Unchanged gateway shared secret |
| `CORS_ORIGINS` | No | `*` initially | Tighten to app + vercel later |

Graceful degradation when `DATABASE_URL` unset: auth/quota routes return `503`; `/v1` chat may skip quota (dev) **or** fail closed — **fail open only if `QUOTA_ENFORCE=false`**, default **fail closed for billable kinds when DB missing in production**. Simpler MVP: if no `DATABASE_URL`, skip quota middleware (log warning) so local OpenRouter still works; document that production must set DB.

### Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/auth/telegram` | none | Body = Telegram Login Widget fields; verify hash; upsert user; return `{ token, user }` |
| `GET` | `/auth/me` | Bearer user JWT | Current user profile |
| `POST` | `/auth/logout` | Bearer optional | Stateless JWT → client discard (no-op server or token denylist skip) |
| `GET` | `/usage` | `X-Device-Id` required; Bearer optional | `{ used, limit, remaining, authenticated }` |

Telegram hash verification: standard Login Widget algorithm (HMAC-SHA256 with SHA256(bot_token) as key). Reject stale `auth_date` (e.g. > 1 day).

JWT claims: `sub` = user id, `telegramId`, `iat`, `exp` (e.g. 30 days).

### Chat middleware

On `POST /v1/chat/completions` (after `requireApiKey`):

1. Read `X-Usage-Kind`: `analyze` | `refine` | `other` (default `other` if missing — **backward compatible**, does not burn quota).
2. If kind is `other` → next().
3. Parse optional `Authorization: Bearer <userJwt>` (distinct from API_KEY: API key already validated; user JWT is second header or same Bearer only if we use `X-User-Token` to avoid clash).

**Header design (important):** today clients send `Authorization: Bearer <API_KEY>`. User session must **not** overwrite that.

Use:
- `Authorization: Bearer <API_KEY>` or `X-API-Key` — gateway (unchanged)
- `X-User-Token: <jwt>` — optional user session
- `X-Device-Id: <uuid>` — required for billable kinds
- `X-Usage-Kind: analyze | refine | other`

4. If valid user JWT → allow; optionally record UsageEvent with userId; next().
5. Else ensure Device by `X-Device-Id`; if used >= limit → `402` `{ code: "QUOTA_EXCEEDED", message, used, limit, remaining: 0 }`.
6. Else proceed; after successful upstream initiation, insert UsageEvent.

## Frontend (`ai-food`)

### Device id (Capacitor)

- Prefer `@capacitor/device` identifier where available + fall back to generated UUID stored in `@capacitor/preferences` under key `ai-food-device-id`.
- Web: same Preferences/localStorage path so PWA works.
- Export helper `getDeviceId(): Promise<string>` from shared/lib or features/auth.

### AI calls

- `analyzeFoodApi` / `refineMealApi` (and any stream helpers they use): set `X-Device-Id`, `X-Usage-Kind: analyze|refine`.
- Other gateway calls: `X-Usage-Kind: other` or omit.
- If user JWT present: `X-User-Token`.

### Auth bridge

- Keep mock login for local UX.
- Add real path: Telegram Login Widget on `/login` when `VITE_TELEGRAM_BOT_USERNAME` set and not mock-only; callback → `POST {VITE_AI_GATEWAY_URL}/auth/telegram` → store JWT in auth Zustand persist.
- On `QUOTA_EXCEEDED`: toast + navigate `/login`.

### Settings

- Fetch `GET /usage` (device id + optional user token).
- Show remaining / unlimited per product rules.

## Error codes

| HTTP | code | When |
|------|------|------|
| 400 | `DEVICE_ID_REQUIRED` | Billable kind without `X-Device-Id` |
| 401 | `INVALID_TELEGRAM_AUTH` | Bad Telegram hash |
| 401 | `INVALID_USER_TOKEN` | Bad/expired JWT (only when token provided and required path) |
| 402 | `QUOTA_EXCEEDED` | Guest over free limit |
| 503 | `DATABASE_UNAVAILABLE` | Auth/usage when DB required and down |

## Testing

- Unit: Telegram hash verify (known fixture), JWT sign/verify, quota math.
- Integration (supertest): guest under limit / at limit; authenticated bypass; `other` never increments; API_KEY still required when set.
- Frontend: device id stable across reload; Settings remaining display (mock usage endpoint in tests if needed).

## Rollout

1. Land Prisma schema + auth/usage routes + chat middleware in `ai-app` (works without frontend if headers absent → `other`).
2. Wire `ai-food` device id + headers + Settings + Telegram login against gateway.
3. User sets `DATABASE_URL`, `AUTH_SECRET`, `TELEGRAM_BOT_TOKEN`; run `prisma migrate`.

## Open points (resolved in discussion)

- Guest key: Capacitor device id (not IP-primary) ✅
- Count: analyze + refine only ✅
- Post-limit: Telegram login unlocks unlimited until subscription ✅
- Settings shows remaining ✅
