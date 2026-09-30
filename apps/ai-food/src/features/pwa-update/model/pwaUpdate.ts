import { registerSW } from 'virtual:pwa-register';

export type CheckForUpdateResult =
  | 'available'
  | 'uptodate'
  | 'unsupported'
  | 'error';

type NeedRefreshListener = (needRefresh: boolean) => void;

const UPDATE_CHECK_TIMEOUT_MS = 12_000;
const PERIODIC_UPDATE_MS = 60 * 60 * 1000;

let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined;
let registration: ServiceWorkerRegistration | undefined;
let needRefresh = false;
const listeners = new Set<NeedRefreshListener>();

function setNeedRefresh(next: boolean) {
  if (needRefresh === next) return;
  needRefresh = next;
  for (const listener of listeners) {
    listener(needRefresh);
  }
}

function bindRegistration(reg: ServiceWorkerRegistration | undefined) {
  if (!reg || registration === reg) return;
  registration = reg;
}

/** Register the PWA service worker (web only). Call once from main.tsx. */
export function startPwaUpdateRegistration(): void {
  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      setNeedRefresh(true);
    },
    onRegisteredSW(_swUrl, reg) {
      bindRegistration(reg);
      if (!reg) return;
      // Keep checking in the background so a waiting worker can appear
      // before the user opens Settings.
      window.setInterval(() => {
        void reg.update().catch(() => undefined);
      }, PERIODIC_UPDATE_MS);
    },
    onRegisterError() {
      registration = undefined;
    },
  });
}

export function isAppUpdateAvailable(): boolean {
  return needRefresh || Boolean(registration?.waiting);
}

export function subscribeAppUpdateAvailable(
  listener: NeedRefreshListener
): () => void {
  listeners.add(listener);
  listener(isAppUpdateAvailable());
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Ask the service worker to check for a new version.
 * Resolves `available` when a waiting worker is present (or appears during the check).
 */
export async function checkForAppUpdate(): Promise<CheckForUpdateResult> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return 'unsupported';
  }

  if (isAppUpdateAvailable()) {
    return 'available';
  }

  let reg = registration;
  if (!reg) {
    try {
      reg = (await navigator.serviceWorker.getRegistration()) ?? undefined;
      bindRegistration(reg);
    } catch {
      return 'error';
    }
  }

  if (!reg) {
    return 'unsupported';
  }

  if (reg.waiting) {
    setNeedRefresh(true);
    return 'available';
  }

  return new Promise<CheckForUpdateResult>((resolve) => {
    let settled = false;

    const finish = (result: CheckForUpdateResult) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      reg.removeEventListener('updatefound', onUpdateFound);
      if (result === 'available') {
        setNeedRefresh(true);
      }
      resolve(result);
    };

    const onInstallingStateChange = (installing: ServiceWorker) => {
      if (installing.state !== 'installed') return;
      // A controller means this is an update, not the first install.
      if (navigator.serviceWorker.controller) {
        finish('available');
      } else {
        finish('uptodate');
      }
    };

    const onUpdateFound = () => {
      const installing = reg.installing;
      if (!installing) return;
      installing.addEventListener('statechange', () => {
        onInstallingStateChange(installing);
      });
      // Already installed by the time we attach (rare race).
      onInstallingStateChange(installing);
    };

    const timeoutId = window.setTimeout(() => {
      if (reg.waiting || needRefresh) {
        finish('available');
      } else {
        finish('uptodate');
      }
    }, UPDATE_CHECK_TIMEOUT_MS);

    reg.addEventListener('updatefound', onUpdateFound);

    void reg.update().catch(() => {
      finish('error');
    });
  });
}

/** Activate the waiting service worker and reload to the new site build. */
export async function applyAppUpdate(): Promise<void> {
  if (updateSW) {
    await updateSW(true);
    return;
  }
  window.location.reload();
}
