export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
let started = false;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

/** Call once at app bootstrap so we do not miss an early `beforeinstallprompt`. */
export function startPwaInstallCapture(): void {
  if (started || typeof window === 'undefined') return;
  started = true;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    notify();
  });

  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}

export function hasDeferredInstallPrompt(): boolean {
  return deferred !== null;
}

export function subscribeDeferredInstallPrompt(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function promptDeferredInstall(): Promise<
  'accepted' | 'dismissed' | 'unavailable'
> {
  if (!deferred) return 'unavailable';
  const current = deferred;
  await current.prompt();
  const { outcome } = await current.userChoice;
  deferred = null;
  notify();
  return outcome;
}
