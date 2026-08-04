BASE: b3bacd98f22c41278afb8a3741f72528536b36cb
HEAD: 81271edae76c333e7e08f264efbefe02136991a7

81271ed feat(ai-food): Telegram bot deep-link login instead of Login Widget
 .../src/features/auth/api/signInWithTelegram.ts    | 71 +++--------------
 .../auth/api/signInWithTelegramBot.test.ts         | 88 ++++++++++++++++++++++
 .../src/features/auth/api/signInWithTelegramBot.ts | 82 ++++++++++++++++++++
 apps/ai-food/src/features/auth/index.ts            | 10 +--
 .../features/auth/ui/TelegramBotLoginButton.tsx    | 54 +++++++++++++
 .../src/features/auth/ui/TelegramLoginButton.tsx   | 87 ---------------------
 apps/ai-food/src/pages/login/ui/LoginPage.tsx      |  4 +-
 7 files changed, 238 insertions(+), 158 deletions(-)
diff --git a/apps/ai-food/src/features/auth/api/signInWithTelegram.ts b/apps/ai-food/src/features/auth/api/signInWithTelegram.ts
index ef3017d..f7e1f0c 100644
--- a/apps/ai-food/src/features/auth/api/signInWithTelegram.ts
+++ b/apps/ai-food/src/features/auth/api/signInWithTelegram.ts
@@ -1,94 +1,41 @@
-import { getDeviceId } from '@/shared/lib';
 import type { TelegramSession } from '../model/telegramSession';
-import { useAuthStore } from '../model/useAuthStore';
 
-export type TelegramLoginPayload = {
-  id: number;
-  first_name?: string;
-  last_name?: string;
-  username?: string;
-  photo_url?: string;
-  auth_date: number;
-  hash: string;
-};
-
-type AuthTelegramResponse = {
-  token: string;
-  user: {
-    id: string;
-    telegramId: string;
-    username?: string | null;
-    firstName?: string | null;
-    lastName?: string | null;
-    photoUrl?: string | null;
-    name?: string | null;
-  };
+type TelegramGatewayUser = {
+  id: string;
+  telegramId: string;
+  username?: string | null;
+  firstName?: string | null;
+  lastName?: string | null;
+  photoUrl?: string | null;
+  name?: string | null;
 };
 
 function placeholderAvatar(name: string): string {
   const letter = (name.trim()[0] || 'T').toUpperCase();
   return (
     'data:image/svg+xml,' +
     encodeURIComponent(
       `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">` +
         `<circle cx="32" cy="32" r="32" fill="#229ED9"/>` +
         `<text x="32" y="40" text-anchor="middle" font-size="28" fill="#fff" font-family="sans-serif">${letter}</text>` +
         `</svg>`,
     )
   );
 }
 
 export function mapTelegramUserToSession(
-  user: AuthTelegramResponse['user'],
+  user: TelegramGatewayUser,
 ): TelegramSession {
   const name =
     user.name?.trim() ||
     [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
     user.username ||
     'Telegram User';
   return {
     id: user.id,
     name,
     username: user.username ?? '',
     photo_url: user.photoUrl || placeholderAvatar(name),
     telegramId: Number(user.telegramId) || undefined,
   };
 }
-
-/**
- * Exchange Telegram Login Widget payload for gateway JWT + local session.
- */
-export async function signInWithTelegram(
-  payload: TelegramLoginPayload,
-): Promise<TelegramSession> {
-  const gatewayUrl = import.meta.env.VITE_AI_GATEWAY_URL as string | undefined;
-  if (!gatewayUrl?.trim()) {
-    throw new Error('VITE_AI_GATEWAY_URL ╨╜╨╡ ╨╖╨░╨┤╨░╨╜');
-  }
-
-  const deviceId = await getDeviceId();
-  const res = await fetch(`${gatewayUrl.replace(/\/$/, '')}/auth/telegram`, {
-    method: 'POST',
-    headers: { 'Content-Type': 'application/json' },
-    body: JSON.stringify({ ...payload, deviceId }),
-  });
-
-  const data = (await res.json().catch(() => ({}))) as AuthTelegramResponse & {
-    message?: string;
-    code?: string;
-  };
-
-  if (!res.ok || !data.token || !data.user) {
-    throw new Error(data.message ?? `╨Т╤Е╨╛╨┤ ╨╜╨╡ ╤Г╨┤╨░╨╗╤Б╤П (${res.status})`);
-  }
-
-  const session = mapTelegramUserToSession(data.user);
-  useAuthStore.getState().signIn(session, data.token);
-  return session;
-}
-
-export function getTelegramBotUsername(): string | null {
-  const raw = (import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined)?.trim();
-  if (!raw) return null;
-  return raw.replace(/^@/, '');
-}
diff --git a/apps/ai-food/src/features/auth/api/signInWithTelegramBot.test.ts b/apps/ai-food/src/features/auth/api/signInWithTelegramBot.test.ts
new file mode 100644
index 0000000..bea4953
--- /dev/null
+++ b/apps/ai-food/src/features/auth/api/signInWithTelegramBot.test.ts
@@ -0,0 +1,88 @@
+import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
+
+const signIn = vi.fn();
+
+vi.mock('@/shared/lib', () => ({
+  getDeviceId: vi.fn(async () => 'test-device'),
+}));
+
+vi.mock('../model/useAuthStore', () => ({
+  useAuthStore: {
+    getState: () => ({ signIn }),
+  },
+}));
+
+describe('signInWithTelegramBot', () => {
+  beforeEach(() => {
+    vi.useFakeTimers();
+    vi.stubEnv('VITE_AI_GATEWAY_URL', 'https://gateway.example/');
+    signIn.mockReset();
+  });
+
+  afterEach(() => {
+    vi.useRealTimers();
+    vi.unstubAllEnvs();
+    vi.unstubAllGlobals();
+  });
+
+  it('opens the bot link and stores the token after pending status', async () => {
+    const user = {
+      id: 'user-1',
+      telegramId: '42',
+      username: 'ada',
+      name: 'Ada Lovelace',
+      photoUrl: 'https://example.com/ada.png',
+    };
+    const fetchMock = vi
+      .fn<typeof fetch>()
+      .mockResolvedValueOnce(
+        new Response(
+          JSON.stringify({
+            challengeId: 'challenge-1',
+            botDeepLink: 'https://t.me/example_bot?start=challenge-1',
+          }),
+          { status: 200 },
+        ),
+      )
+      .mockResolvedValueOnce(
+        new Response(JSON.stringify({ status: 'pending' }), { status: 200 }),
+      )
+      .mockResolvedValueOnce(
+        new Response(
+          JSON.stringify({ status: 'ok', token: 'jwt-token', user }),
+          { status: 200 },
+        ),
+      );
+    vi.stubGlobal('fetch', fetchMock);
+    const openLink = vi.fn();
+    const { signInWithTelegramBot } = await import('./signInWithTelegramBot');
+
+    const resultPromise = signInWithTelegramBot({ openLink });
+    await vi.advanceTimersByTimeAsync(3_000);
+    const session = await resultPromise;
+
+    expect(openLink).toHaveBeenCalledWith(
+      'https://t.me/example_bot?start=challenge-1',
+    );
+    expect(fetchMock).toHaveBeenNthCalledWith(
+      1,
+      'https://gateway.example/auth/telegram/start',
+      expect.objectContaining({
+        method: 'POST',
+        body: JSON.stringify({ deviceId: 'test-device' }),
+      }),
+    );
+    expect(fetchMock).toHaveBeenNthCalledWith(
+      3,
+      'https://gateway.example/auth/telegram/status?challengeId=challenge-1',
+      { signal: undefined },
+    );
+    expect(signIn).toHaveBeenCalledWith(session, 'jwt-token');
+    expect(session).toMatchObject({
+      id: 'user-1',
+      name: 'Ada Lovelace',
+      username: 'ada',
+      telegramId: 42,
+    });
+  });
+});
diff --git a/apps/ai-food/src/features/auth/api/signInWithTelegramBot.ts b/apps/ai-food/src/features/auth/api/signInWithTelegramBot.ts
new file mode 100644
index 0000000..c25d1dd
--- /dev/null
+++ b/apps/ai-food/src/features/auth/api/signInWithTelegramBot.ts
@@ -0,0 +1,82 @@
+import { getDeviceId } from '@/shared/lib';
+import type { TelegramSession } from '../model/telegramSession';
+import { useAuthStore } from '../model/useAuthStore';
+import { mapTelegramUserToSession } from './signInWithTelegram';
+
+type TelegramGatewayUser = {
+  id: string;
+  telegramId: string;
+  username?: string | null;
+  firstName?: string | null;
+  lastName?: string | null;
+  photoUrl?: string | null;
+  name?: string | null;
+};
+
+type TelegramBotLoginOptions = {
+  signal?: AbortSignal;
+  openLink?: (url: string) => void;
+};
+
+export async function signInWithTelegramBot(
+  opts?: TelegramBotLoginOptions,
+): Promise<TelegramSession> {
+  const gatewayUrl = import.meta.env.VITE_AI_GATEWAY_URL as string | undefined;
+  if (!gatewayUrl?.trim()) {
+    throw new Error('VITE_AI_GATEWAY_URL ╨╜╨╡ ╨╖╨░╨┤╨░╨╜');
+  }
+
+  const base = gatewayUrl.replace(/\/$/, '');
+  const deviceId = await getDeviceId();
+  const startRes = await fetch(`${base}/auth/telegram/start`, {
+    method: 'POST',
+    headers: { 'Content-Type': 'application/json' },
+    body: JSON.stringify({ deviceId }),
+    signal: opts?.signal,
+  });
+  const start = (await startRes.json()) as {
+    challengeId?: string;
+    botDeepLink?: string;
+    message?: string;
+  };
+
+  if (!startRes.ok || !start.challengeId || !start.botDeepLink) {
+    throw new Error(
+      start.message ?? `╨Э╨╡ ╤Г╨┤╨░╨╗╨╛╤Б╤М ╨╜╨░╤З╨░╤В╤М ╨▓╤Е╨╛╨┤ (${startRes.status})`,
+    );
+  }
+
+  (opts?.openLink ?? ((url: string) => window.open(url, '_blank')))(
+    start.botDeepLink,
+  );
+
+  const deadline = Date.now() + 5 * 60 * 1000;
+  while (Date.now() < deadline) {
+    if (opts?.signal?.aborted) {
+      throw new Error('╨Т╤Е╨╛╨┤ ╨╛╤В╨╝╨╡╨╜╤С╨╜');
+    }
+
+    await new Promise((resolve) => setTimeout(resolve, 1_500));
+    const statusRes = await fetch(
+      `${base}/auth/telegram/status?challengeId=${encodeURIComponent(start.challengeId)}`,
+      { signal: opts?.signal },
+    );
+    const status = (await statusRes.json()) as {
+      status: string;
+      token?: string;
+      user?: TelegramGatewayUser;
+      message?: string;
+    };
+
+    if (status.status === 'ok' && status.token && status.user) {
+      const session = mapTelegramUserToSession(status.user);
+      useAuthStore.getState().signIn(session, status.token);
+      return session;
+    }
+    if (status.status === 'expired') {
+      throw new Error('╨б╨╡╤Б╤Б╨╕╤П ╨▓╤Е╨╛╨┤╨░ ╨╕╤Б╤В╨╡╨║╨╗╨░. ╨Я╨╛╨┐╤А╨╛╨▒╤Г╨╣╤В╨╡ ╤Б╨╜╨╛╨▓╨░.');
+    }
+  }
+
+  throw new Error('╨Т╤А╨╡╨╝╤П ╨╛╨╢╨╕╨┤╨░╨╜╨╕╤П ╨▓╤Е╨╛╨┤╨░ ╨╕╤Б╤В╨╡╨║╨╗╨╛.');
+}
diff --git a/apps/ai-food/src/features/auth/index.ts b/apps/ai-food/src/features/auth/index.ts
index 2b05c78..b8c32b6 100644
--- a/apps/ai-food/src/features/auth/index.ts
+++ b/apps/ai-food/src/features/auth/index.ts
@@ -10,17 +10,13 @@ export {
   fetchUsage,
   getCachedUsage,
   hydrateUsageCache,
   createDefaultGuestUsage,
   getEffectiveFreeLimit,
   GUEST_FREE_USAGE_LIMIT,
   AUTH_LOGIN_GENERATION_BONUS,
   type UsageSnapshot,
 } from './api/fetchUsage';
 export { useUsage, usageQueryKey } from './model/useUsage';
-export {
-  signInWithTelegram,
-  getTelegramBotUsername,
-  mapTelegramUserToSession,
-  type TelegramLoginPayload,
-} from './api/signInWithTelegram';
-export { TelegramLoginButton } from './ui/TelegramLoginButton';
+export { mapTelegramUserToSession } from './api/signInWithTelegram';
+export { signInWithTelegramBot } from './api/signInWithTelegramBot';
+export { TelegramBotLoginButton } from './ui/TelegramBotLoginButton';
diff --git a/apps/ai-food/src/features/auth/ui/TelegramBotLoginButton.tsx b/apps/ai-food/src/features/auth/ui/TelegramBotLoginButton.tsx
new file mode 100644
index 0000000..a171c43
--- /dev/null
+++ b/apps/ai-food/src/features/auth/ui/TelegramBotLoginButton.tsx
@@ -0,0 +1,54 @@
+import { useEffect, useRef, useState } from 'react';
+import { Button } from '@/shared/ui';
+import { signInWithTelegramBot } from '../api/signInWithTelegramBot';
+
+type TelegramBotLoginButtonProps = {
+  onSuccess: () => void;
+  onError: (message: string) => void;
+};
+
+export function TelegramBotLoginButton({
+  onSuccess,
+  onError,
+}: TelegramBotLoginButtonProps) {
+  const [busy, setBusy] = useState(false);
+  const controllerRef = useRef<AbortController | null>(null);
+
+  useEffect(
+    () => () => {
+      controllerRef.current?.abort();
+    },
+    [],
+  );
+
+  const handleLogin = async () => {
+    const controller = new AbortController();
+    controllerRef.current = controller;
+    setBusy(true);
+
+    try {
+      await signInWithTelegramBot({ signal: controller.signal });
+      onSuccess();
+    } catch (error) {
+      if (!controller.signal.aborted) {
+        onError(
+          error instanceof Error
+            ? error.message
+            : '╨Э╨╡ ╤Г╨┤╨░╨╗╨╛╤Б╤М ╨▓╨╛╨╣╤В╨╕ ╤З╨╡╤А╨╡╨╖ Telegram',
+        );
+      }
+    } finally {
+      if (!controller.signal.aborted) {
+        setBusy(false);
+      }
+    }
+  };
+
+  return (
+    <Button className="w-full" disabled={busy} onClick={() => void handleLogin()}>
+      {busy
+        ? '╨Ю╨╢╨╕╨┤╨░╨╡╨╝ ╨┐╨╛╨┤╤В╨▓╨╡╤А╨╢╨┤╨╡╨╜╨╕╨╡ ╨▓ TelegramтАж'
+        : '╨Т╨╛╨╣╤В╨╕ ╤З╨╡╤А╨╡╨╖ Telegram'}
+    </Button>
+  );
+}
diff --git a/apps/ai-food/src/features/auth/ui/TelegramLoginButton.tsx b/apps/ai-food/src/features/auth/ui/TelegramLoginButton.tsx
deleted file mode 100644
index 3936e78..0000000
--- a/apps/ai-food/src/features/auth/ui/TelegramLoginButton.tsx
+++ /dev/null
@@ -1,87 +0,0 @@
-import { useEffect, useRef, useState } from 'react';
-import {
-  getTelegramBotUsername,
-  signInWithTelegram,
-  type TelegramLoginPayload,
-} from '../api/signInWithTelegram';
-
-declare global {
-  interface Window {
-    onTelegramAuth?: (user: TelegramLoginPayload) => void;
-  }
-}
-
-type TelegramLoginButtonProps = {
-  onSuccess: () => void;
-  onError: (message: string) => void;
-};
-
-/**
- * Official Telegram Login Widget (works on BotFather Login Widget domain).
- */
-export function TelegramLoginButton({ onSuccess, onError }: TelegramLoginButtonProps) {
-  const containerRef = useRef<HTMLDivElement>(null);
-  const [busy, setBusy] = useState(false);
-  const botUsername = getTelegramBotUsername();
-  const onSuccessRef = useRef(onSuccess);
-  const onErrorRef = useRef(onError);
-  onSuccessRef.current = onSuccess;
-  onErrorRef.current = onError;
-
-  useEffect(() => {
-    const el = containerRef.current;
-    if (!el || !botUsername) return;
-
-    window.onTelegramAuth = (user: TelegramLoginPayload) => {
-      setBusy(true);
-      void signInWithTelegram(user)
-        .then(() => onSuccessRef.current())
-        .catch((err: unknown) => {
-          const message =
-            err instanceof Error ? err.message : '╨Э╨╡ ╤Г╨┤╨░╨╗╨╛╤Б╤М ╨▓╨╛╨╣╤В╨╕ ╤З╨╡╤А╨╡╨╖ Telegram';
-          onErrorRef.current(message);
-        })
-        .finally(() => setBusy(false));
-    };
-
-    el.innerHTML = '';
-    const script = document.createElement('script');
-    script.async = true;
-    script.src = 'https://telegram.org/js/telegram-widget.js?22';
-    script.setAttribute('data-telegram-login', botUsername);
-    script.setAttribute('data-size', 'large');
-    script.setAttribute('data-radius', '8');
-    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
-    // Do not request `write`: after user revokes site access in Telegram,
-    // write permission is also revoked and re-login often hangs waiting for
-    // a confirmation that never arrives. Profile login alone is enough for JWT.
-    el.appendChild(script);
-
-    return () => {
-      delete window.onTelegramAuth;
-      el.innerHTML = '';
-    };
-  }, [botUsername]);
-
-  if (!botUsername) {
-    return (
-      <p className="text-sm text-muted-foreground">
-        ╨Ч╨░╨┤╨░╨╣╤В╨╡ <code className="text-xs">VITE_TELEGRAM_BOT_USERNAME</code> ╨▓
-        .env, ╤З╤В╨╛╨▒╤Л ╨┐╨╛╨║╨░╨╖╨░╤В╤М Telegram Login.
-      </p>
-    );
-  }
-
-  return (
-    <div className="space-y-2">
-      <div
-        ref={containerRef}
-        className="flex min-h-[40px] justify-center [color-scheme:light] [&_iframe]:bg-transparent"
-        aria-busy={busy}
-      />
-      {busy && (
-        <p className="text-center text-sm text-muted-foreground">╨Т╤Е╨╛╨┤╨╕╨╝тАж</p>
-      )}
-    </div>
-  );
-}
diff --git a/apps/ai-food/src/pages/login/ui/LoginPage.tsx b/apps/ai-food/src/pages/login/ui/LoginPage.tsx
index 8ea6d86..9fe1783 100644
--- a/apps/ai-food/src/pages/login/ui/LoginPage.tsx
+++ b/apps/ai-food/src/pages/login/ui/LoginPage.tsx
@@ -1,20 +1,20 @@
 import { useNavigate } from 'react-router-dom';
 import { toast } from 'sonner';
 import {
   AUTH_LOGIN_GENERATION_BONUS,
   GUEST_FREE_USAGE_LIMIT,
   getEffectiveFreeLimit,
   isAuthMockEnabled,
   signInWithMockTelegram,
   signOut,
-  TelegramLoginButton,
+  TelegramBotLoginButton,
   useAuthStore,
 } from '@/features/auth';
 import { Button, SubpageShell } from '@/shared/ui';
 
 export function LoginPage() {
   const navigate = useNavigate();
   const session = useAuthStore((s) => s.session);
   const mockEnabled = isAuthMockEnabled();
 
   const handleMockSignIn = () => {
@@ -61,21 +61,21 @@ export function LoginPage() {
             ╨У╨╛╤Б╤В╤П╨╝ ╨┤╨╛╤Б╤В╤Г╨┐╨╜╨╛ {GUEST_FREE_USAGE_LIMIT} ╨▒╨╡╤Б╨┐╨╗╨░╤В╨╜╤Л╤Е
             ╨░╨╜╨░╨╗╨╕╨╖╨╛╨▓/╨┤╨╛╨┐╨╛╨╗╨╜╨╡╨╜╨╕╨╣. ╨Я╨╛╤Б╨╗╨╡ ╨▓╤Е╨╛╨┤╨░ ╤З╨╡╤А╨╡╨╖ Telegram тАФ ╨╡╤Й╤С{' '}
             {AUTH_LOGIN_GENERATION_BONUS} (╨╕╤В╨╛╨│╨╛{' '}
             {getEffectiveFreeLimit(true)}). ╨Ъ╨╛╨│╨┤╨░ ╨╗╨╕╨╝╨╕╤В ╨║╨╛╨╜╤З╨╕╤В╤Б╤П, ╨╛╤Д╨╛╤А╨╝╨╕╤В╨╡
             ╨│╨╛╨┤╨╛╨▓╤Г╤О ╨╗╨╕╤Ж╨╡╨╜╨╖╨╕╤О. ╨Ф╨╜╨╡╨▓╨╜╨╕╨║, ╤А╤Г╤З╨╜╨╛╨╣ ╨▓╨▓╨╛╨┤ ╨╕ ╤Б╤В╨░╤В╨╕╤Б╤В╨╕╨║╨░ ╤А╨░╨▒╨╛╤В╨░╤О╤В ╨▒╨╡╨╖
             ╨╛╨┐╨╗╨░╤В╤Л.
           </p>
 
           <div className="rounded-md border border-border bg-card px-4 py-5">
             <p className="mb-3 text-center text-sm font-medium">Telegram</p>
-            <TelegramLoginButton
+            <TelegramBotLoginButton
               onSuccess={handleTelegramSuccess}
               onError={(message) => toast.error(message)}
             />
           </div>
 
           {mockEnabled && (
             <Button variant="outline" className="w-full" onClick={handleMockSignIn}>
               ╨Т╨╛╨╣╤В╨╕ (╨┤╨╡╨╝╨╛, ╨▒╨╡╨╖ ╤Б╨╡╤А╨▓╨╡╤А╨░)
             </Button>
           )}
