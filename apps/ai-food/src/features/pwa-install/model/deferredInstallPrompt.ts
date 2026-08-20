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

/**
 * Show native install dialog. `prompt()` must run in the same turn as the
 * user click — no `await` before it (breaks gesture → silent fail in Yandex/Chrome).
 */
export function promptDeferredInstall(): Promise<
  'accepted' | 'dismissed' | 'unavailable'
> {
  adoptEarlyDeferred();
  if (!deferred) return Promise.resolve('unavailable');

  const current = deferred;
  let promptPromise: Promise<void>;
  try {
    promptPromise = current.prompt();
  } catch {
    setDeferred(null);
    return Promise.resolve('unavailable');
  }

  return promptPromise
    .then(() => current.userChoice)
    .then(({ outcome }) => {
      setDeferred(null);
      return outcome;
    })
    .catch(() => {
      setDeferred(null);
      return 'unavailable' as const;
    });
}
