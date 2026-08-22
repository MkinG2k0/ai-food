import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  hasDeferredInstallPrompt,
  promptDeferredInstall,
  startPwaInstallCapture,
  subscribeDeferredInstallPrompt,
} from './deferredInstallPrompt';

function makePrompt(outcome: 'accepted' | 'dismissed' = 'accepted') {
  return {
    preventDefault: vi.fn(),
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome }),
  };
}

describe('deferredInstallPrompt', () => {
  beforeEach(() => {
    window.__aifoodPwa = { deferred: null };
  });

  afterEach(() => {
    delete window.__aifoodPwa;
  });

  it('captures beforeinstallprompt and clears on appinstalled', () => {
    startPwaInstallCapture();

    const prompt = makePrompt();
    window.dispatchEvent(
      new Event('beforeinstallprompt') as Event & { preventDefault: () => void },
    );
    Object.assign(window, {
      __aifoodPwa: { deferred: prompt },
    });

    expect(hasDeferredInstallPrompt()).toBe(true);

    window.dispatchEvent(new Event('appinstalled'));
    expect(hasDeferredInstallPrompt()).toBe(false);
  });

  it('adopts early deferred prompt from bootstrap hook', () => {
    const early = makePrompt();
    window.__aifoodPwa = { deferred: early as never };

    startPwaInstallCapture();
    expect(hasDeferredInstallPrompt()).toBe(true);
  });

  it('notifies subscribers when deferred prompt changes', () => {
    startPwaInstallCapture();
    const listener = vi.fn();
    const unsubscribe = subscribeDeferredInstallPrompt(listener);

    const prompt = makePrompt();
    window.__aifoodPwa = { deferred: prompt as never };
    expect(hasDeferredInstallPrompt()).toBe(true);
    expect(listener).toHaveBeenCalled();

    unsubscribe();
    window.dispatchEvent(new Event('appinstalled'));
    expect(hasDeferredInstallPrompt()).toBe(false);
  });

  it('promptDeferredInstall resolves accepted outcome', async () => {
    startPwaInstallCapture();
    const prompt = makePrompt('accepted');
    window.__aifoodPwa = { deferred: prompt as never };

    await expect(promptDeferredInstall()).resolves.toBe('accepted');
    expect(prompt.prompt).toHaveBeenCalled();
    expect(hasDeferredInstallPrompt()).toBe(false);
  });

  it('promptDeferredInstall returns unavailable when prompt missing', async () => {
    startPwaInstallCapture();
    await expect(promptDeferredInstall()).resolves.toBe('unavailable');
  });

  it('promptDeferredInstall handles prompt() throw', async () => {
    startPwaInstallCapture();
    const prompt = {
      prompt: vi.fn(() => {
        throw new Error('gesture required');
      }),
      userChoice: Promise.resolve({ outcome: 'dismissed' as const }),
    };
    window.__aifoodPwa = { deferred: prompt as never };

    await expect(promptDeferredInstall()).resolves.toBe('unavailable');
    expect(hasDeferredInstallPrompt()).toBe(false);
  });

  it('startPwaInstallCapture is idempotent', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    startPwaInstallCapture();
    const firstCount = addSpy.mock.calls.length;
    startPwaInstallCapture();
    expect(addSpy.mock.calls.length).toBe(firstCount);
    addSpy.mockRestore();
  });
});
