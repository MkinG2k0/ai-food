### Task 7: Frontend — bot login UX

**Files:**
- Create: `apps/ai-food/src/features/auth/api/signInWithTelegramBot.ts`
- Create: `apps/ai-food/src/features/auth/api/signInWithTelegramBot.test.ts`
- Create: `apps/ai-food/src/features/auth/ui/TelegramBotLoginButton.tsx`
- Modify: `apps/ai-food/src/features/auth/index.ts`
- Modify: `apps/ai-food/src/pages/login/ui/LoginPage.tsx`
- Delete or stop exporting: `TelegramLoginButton.tsx`, widget-based `signInWithTelegram.ts` (replace implementation in place **or** delete and update imports — prefer replace `signInWithTelegram.ts` API with bot flow to minimize churn, keep `mapTelegramUserToSession`)

**Interfaces:**
- Consumes: `POST /auth/telegram/start`, `GET /auth/telegram/status`, `useAuthStore.signIn`, `getDeviceId`, `mapTelegramUserToSession`
- Produces: `startTelegramBotLogin(): Promise<TelegramSession>` (opens link + polls) OR split `createTelegramLoginChallenge` + `pollTelegramLoginStatus`

- [ ] **Step 1: Rewrite client API (TDD)**

Keep `mapTelegramUserToSession` tests. Replace `signInWithTelegram` body:

```ts
export async function signInWithTelegramBot(
  opts?: { signal?: AbortSignal; openLink?: (url: string) => void },
): Promise<TelegramSession> {
  const gatewayUrl = import.meta.env.VITE_AI_GATEWAY_URL as string | undefined;
  if (!gatewayUrl?.trim()) throw new Error('VITE_AI_GATEWAY_URL не задан');
  const base = gatewayUrl.replace(/\/$/, '');
  const deviceId = await getDeviceId();

  const startRes = await fetch(`${base}/auth/telegram/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId }),
    signal: opts?.signal,
  });
  const start = (await startRes.json()) as {
    challengeId?: string;
    botDeepLink?: string;
    message?: string;
  };
  if (!startRes.ok || !start.challengeId || !start.botDeepLink) {
    throw new Error(start.message ?? `Не удалось начать вход (${startRes.status})`);
  }

  (opts?.openLink ?? ((url: string) => window.open(url, '_blank')))(
    start.botDeepLink,
  );

  const deadline = Date.now() + 5 * 60 * 1000;
  while (Date.now() < deadline) {
    if (opts?.signal?.aborted) throw new Error('Вход отменён');
    await new Promise((r) => setTimeout(r, 1500));
    const st = await fetch(
      `${base}/auth/telegram/status?challengeId=${encodeURIComponent(start.challengeId)}`,
      { signal: opts?.signal },
    );
    const data = (await st.json()) as {
      status: string;
      token?: string;
      user?: AuthTelegramResponse['user'];
      message?: string;
    };
    if (data.status === 'ok' && data.token && data.user) {
      const session = mapTelegramUserToSession(data.user);
      useAuthStore.getState().signIn(session, data.token);
      return session;
    }
    if (data.status === 'expired') {
      throw new Error('Сессия входа истекла. Попробуйте снова.');
    }
  }
  throw new Error('Время ожидания входа истекло.');
}
```

Unit-test with mocked `fetch` + fake timers: pending → ok path stores token.

- [ ] **Step 2: UI button**

Replace `TelegramLoginButton` with a normal Button: «Войти через Telegram» → calls `signInWithTelegramBot`, loading state «Ожидаем подтверждение в Telegram…», cancel via AbortController on unmount.

Remove telegram-widget.js script usage entirely.

- [ ] **Step 3: Wire `LoginPage` + exports**

Update `index.ts` exports; remove widget types if unused.

- [ ] **Step 4: Run ai-food auth tests**

Run: `cd apps/ai-food && pnpm exec vitest run src/features/auth`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/ai-food/src/features/auth apps/ai-food/src/pages/login
git commit -m "feat(ai-food): Telegram bot deep-link login instead of Login Widget"
```

---

