import { useEffect, useState } from 'react';
import {
  hasDeferredInstallPrompt,
  promptDeferredInstall,
  startPwaInstallCapture,
  subscribeDeferredInstallPrompt,
} from './deferredInstallPrompt';

/**
 * Chromium install prompt captured at bootstrap via `startPwaInstallCapture`.
 */
export function usePwaInstallPrompt() {
  const [canPrompt, setCanPrompt] = useState(() => hasDeferredInstallPrompt());

  useEffect(() => {
    startPwaInstallCapture();
    setCanPrompt(hasDeferredInstallPrompt());
    return subscribeDeferredInstallPrompt(() => {
      setCanPrompt(hasDeferredInstallPrompt());
    });
  }, []);

  return { canPrompt, promptInstall: promptDeferredInstall };
}
