BASE: cdde860d493cf62d2fa015b9739f409254ae183a
HEAD: 8db7ba6a29edc811b9108e4c7e78fbb65cf6b12d

8db7ba6 feat(ai-app): add Telegram login challenge store
 apps/ai-app/src/lib/telegramLoginChallenge.test.ts | 41 ++++++++++
 apps/ai-app/src/lib/telegramLoginChallenge.ts      | 91 ++++++++++++++++++++++
 2 files changed, 132 insertions(+)
diff --git a/apps/ai-app/src/lib/telegramLoginChallenge.test.ts b/apps/ai-app/src/lib/telegramLoginChallenge.test.ts
new file mode 100644
index 0000000..cd494d5
--- /dev/null
+++ b/apps/ai-app/src/lib/telegramLoginChallenge.test.ts
@@ -0,0 +1,41 @@
+import { afterEach, describe, expect, it } from 'vitest';
+import {
+  clearAllLoginChallengesForTests,
+  confirmLoginChallenge,
+  consumeLoginChallenge,
+  createLoginChallenge,
+  getLoginChallengeByNonce,
+} from './telegramLoginChallenge.js';
+
+describe('telegramLoginChallenge', () => {
+  afterEach(() => {
+    clearAllLoginChallengesForTests();
+  });
+
+  it('create тЖТ confirm тЖТ consume тЖТ second consume null', () => {
+    const { id, nonce } = createLoginChallenge({ deviceId: 'dev-1' });
+    expect(getLoginChallengeByNonce(nonce)?.status).toBe('pending');
+
+    expect(
+      confirmLoginChallenge(nonce, { userId: 'u1', token: 'jwt-1' }),
+    ).toBe(true);
+
+    const first = consumeLoginChallenge(id);
+    expect(first).toEqual({ userId: 'u1', token: 'jwt-1' });
+    expect(consumeLoginChallenge(id)).toBeNull();
+  });
+
+  it('rejects confirm for unknown nonce', () => {
+    expect(
+      confirmLoginChallenge('nope', { userId: 'u1', token: 'jwt' }),
+    ).toBe(false);
+  });
+
+  it('expires pending challenges', () => {
+    const { id, nonce } = createLoginChallenge({ ttlMs: -1 });
+    expect(confirmLoginChallenge(nonce, { userId: 'u1', token: 'jwt' })).toBe(
+      false,
+    );
+    expect(consumeLoginChallenge(id)).toBeNull();
+  });
+});
diff --git a/apps/ai-app/src/lib/telegramLoginChallenge.ts b/apps/ai-app/src/lib/telegramLoginChallenge.ts
new file mode 100644
index 0000000..3a574d5
--- /dev/null
+++ b/apps/ai-app/src/lib/telegramLoginChallenge.ts
@@ -0,0 +1,91 @@
+import { randomBytes, randomUUID } from 'node:crypto';
+
+const DEFAULT_TTL_MS = 5 * 60 * 1000;
+
+export type LoginChallengeStatus = 'pending' | 'confirmed' | 'consumed';
+
+export type LoginChallenge = {
+  id: string;
+  nonce: string;
+  status: LoginChallengeStatus;
+  deviceId?: string;
+  userId?: string;
+  token?: string;
+  expiresAt: number;
+};
+
+const byId = new Map<string, LoginChallenge>();
+const byNonce = new Map<string, string>();
+
+function isExpired(c: LoginChallenge, now = Date.now()): boolean {
+  return now >= c.expiresAt;
+}
+
+function purgeIfExpired(id: string): LoginChallenge | null {
+  const c = byId.get(id);
+  if (!c) return null;
+  if (isExpired(c) || c.status === 'consumed') {
+    byId.delete(id);
+    byNonce.delete(c.nonce);
+    return null;
+  }
+  return c;
+}
+
+export function createLoginChallenge(opts?: {
+  deviceId?: string;
+  ttlMs?: number;
+}): { id: string; nonce: string; expiresAt: Date } {
+  const id = randomUUID();
+  const nonce = randomBytes(24).toString('base64url');
+  const expiresAt = Date.now() + (opts?.ttlMs ?? DEFAULT_TTL_MS);
+  const challenge: LoginChallenge = {
+    id,
+    nonce,
+    status: 'pending',
+    expiresAt,
+    ...(opts?.deviceId ? { deviceId: opts.deviceId } : {}),
+  };
+  byId.set(id, challenge);
+  byNonce.set(nonce, id);
+  return { id, nonce, expiresAt: new Date(expiresAt) };
+}
+
+export function getLoginChallengeById(id: string): LoginChallenge | null {
+  return purgeIfExpired(id);
+}
+
+export function getLoginChallengeByNonce(nonce: string): LoginChallenge | null {
+  const id = byNonce.get(nonce);
+  if (!id) return null;
+  return purgeIfExpired(id);
+}
+
+export function confirmLoginChallenge(
+  nonce: string,
+  opts: { userId: string; token: string },
+): boolean {
+  const c = getLoginChallengeByNonce(nonce);
+  if (!c || c.status !== 'pending') return false;
+  c.status = 'confirmed';
+  c.userId = opts.userId;
+  c.token = opts.token;
+  return true;
+}
+
+export function consumeLoginChallenge(
+  id: string,
+): { token: string; userId: string } | null {
+  const c = purgeIfExpired(id);
+  if (!c || c.status !== 'confirmed' || !c.token || !c.userId) return null;
+  const result = { token: c.token, userId: c.userId };
+  c.status = 'consumed';
+  byId.delete(id);
+  byNonce.delete(c.nonce);
+  return result;
+}
+
+export function clearAllLoginChallengesForTests(): void {
+  byId.clear();
+  byNonce.clear();
+}
