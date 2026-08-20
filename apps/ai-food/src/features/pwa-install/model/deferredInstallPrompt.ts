export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    __aifoodPwa?: { deferred: BeforeInstallPromptEvent | null };
  }
}

let deferred: BeforeInstallPromptEvent | null = null;
let started = false;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function adoptEarlyDeferred(): void {
  const early = window.__aifoodPwa?.deferred ?? null;
  if (early && deferred !== early) {
    deferred = early;
    notify();
  }
}

function setDeferred(next: BeforeInstallPromptEvent | null): void {
  deferred = next;
  if (typeof window !== 'undefined' && window.__aifoodPwa) {
    window.__aifoodPwa.deferred = next;
  }
  notify();
}

/** Call once at app bootstrap so we do not miss an early `beforeinstallprompt`. */
export function startPwaInstallCapture(): void {
  if (started || typeof window === 'undefined') return;
  started = true;

  adoptEarlyDeferred();

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    setDeferred(event as BeforeInstallPromptEvent);
  });

  window.addEventListener('appinstalled', () => {
    setDeferred(null);
  });
}

export function hasDeferredInstallPrompt(): boolean {
  if (typeof window !== 'undefined') adoptEarlyDeferred();
  return deferred !== null;
}

export function subscribeDeferredInstallPrompt(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Wait for a late `beforeinstallprompt` (common after SW activates). */
export function waitForDeferredInstall(timeoutMs = 2500): Promise<boolean> {
  if (hasDeferredInstallPrompt()) return Promise.resolve(true);

  return new Promise((resolve) => {
    const done = (ok: boolean) => {
      clearTimeout(timer);
      unsub();
      resolve(ok);
    };
    const unsub = subscribeDeferredInstallPrompt(() => {
      if (hasDeferredInstallPrompt()) done(true);
    });
    const timer = setTimeout(() => done(hasDeferredInstallPrompt()), timeoutMs);
  });
}

export async function promptDeferredInstall(): Promise<
  'accepted' | 'dismissed' | 'unavailable'
> {
  adoptEarlyDeferred();
  if (!deferred) {
    const got = await waitForDeferredInstall(2500);
    if (!got || !deferred) return 'unavailable';
  }

  const current = deferred;
  try {
    await current.prompt();
    const { outcome } = await current.userChoice;
    setDeferred(null);
    return outcome;
  } catch {
    setDeferred(null);
    return 'unavailable';
  }
}
