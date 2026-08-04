### Task 6: Scaffold `apps/ai-web` (Next.js + Ant Design)

**Files:**
- Create: `apps/ai-web/package.json`, `tsconfig.json`, `next.config.ts`, `next-env.d.ts`
- Create: `apps/ai-web/src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Create: `apps/ai-web/.env.example`, `.gitignore` (if needed)
- Modify: root `package.json` scripts
- Modify: `turbo.json` env lists for Next build if needed

**Interfaces:**
- Package name: `ai-web`
- Dev port: **3001**
- Dependencies: `next@15`, `react@18`, `react-dom@18`, `antd`, `@ant-design/nextjs-registry`, `@ant-design/icons`, `@tanstack/react-query`, `jose`, `typescript`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "ai-web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3001",
    "build": "next build",
    "start": "next start --port 3001",
    "type-check": "tsc --noEmit",
    "test": "echo \"no tests yet\" && exit 0"
  },
  "dependencies": {
    "@ant-design/icons": "^5.6.1",
    "@ant-design/nextjs-registry": "^1.0.2",
    "@tanstack/react-query": "^5.51.1",
    "antd": "^5.24.2",
    "jose": "^6.2.8",
    "next": "^15.2.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/node": "^20.14.10",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.5.3"
  },
  "engines": {
    "node": ">=20.19.0",
    "pnpm": ">=9"
  }
}
```

- [ ] **Step 2: tsconfig + next.config**

`tsconfig.json` вЂ” Next defaults with `"paths": { "@/*": ["./src/*"] }`, `strict: true`.

`next.config.ts`:

```ts
import type { NextConfig } from 'next';
const nextConfig: NextConfig = {};
export default nextConfig;
```

- [ ] **Step 3: Root layout + landing stub**

`src/app/layout.tsx` вЂ” html/body, `AntdRegistry`, Russian `ConfigProvider` locale optional.

`src/app/page.tsx` вЂ” minimal stub: product name **AI Food** + В«РЎРєРѕСЂРѕВ» (no Ant Layout chrome).

`src/app/globals.css` вЂ” basic body margin reset.

- [ ] **Step 4: `.env.example`**

```
# UI login password (generate: openssl rand -base64 24)
ADMIN_PASSWORD=
# Session cookie signing (openssl rand -base64 32)
ADMIN_SESSION_SECRET=
# Same value as apps/ai-app ADMIN_API_KEY (server-only)
ADMIN_API_KEY=
# Gateway base URL
AI_GATEWAY_URL=http://127.0.0.1:3000
```

- [ ] **Step 5: Wire monorepo**

Root `package.json`:

```json
"dev:web": "turbo run dev --filter=ai-web",
"build:web": "turbo run build --filter=ai-web"
```

- [ ] **Step 6: Install + type-check**

Run from repo root:

```bash
pnpm install
pnpm --filter ai-web type-check
```

Expected: PASS

- [ ] **Step 7: Generate local secrets into `apps/ai-web/.env` and append matching `ADMIN_API_KEY` to `apps/ai-app/.env`** (do **not** commit `.env`)

PowerShell example:

```powershell
$pwd = [Convert]::ToBase64String((1..24 | ForEach-Object { Get-Random -Max 256 }) -as [byte[]])
$sess = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }) -as [byte[]])
$key = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }) -as [byte[]])
```

Write values into both env files. Print `ADMIN_PASSWORD` once in the commit message notes / terminal for the human (not into git).

- [ ] **Step 8: Commit scaffold only (no `.env`)**

```bash
git add apps/ai-web package.json turbo.json pnpm-lock.yaml
git commit -m "feat(ai-web): scaffold Next.js app with Ant Design for admin/landing"
```

---
