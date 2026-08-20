import { describe, it, expect, beforeEach, vi } from 'vitest';

const isNativePlatform = vi.fn(() => false);

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => isNativePlatform(),
  },
}));

import {
  getOpenInChromeHref,
  shouldOfferPwaInstall,
  shouldShowSettingsPwaInstall,
} from './pwaInstallEnv';

describe('shouldOfferPwaInstall', () => {
  beforeEach(() => {
    isNativePlatform.mockReturnValue(false);
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  it('offers install on first web visit', () => {
    expect(shouldOfferPwaInstall(false)).toBe(true);
  });

  it('hides after dismiss', () => {
    expect(shouldOfferPwaInstall(true)).toBe(false);
  });

  it('hides in native Capacitor app', () => {
    isNativePlatform.mockReturnValue(true);
    expect(shouldOfferPwaInstall(false)).toBe(false);
  });

  it('hides when already running as installed PWA', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('standalone'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
    expect(shouldOfferPwaInstall(false)).toBe(false);
  });
});

describe('shouldShowSettingsPwaInstall', () => {
  beforeEach(() => {
    isNativePlatform.mockReturnValue(false);
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  it('hides before first-visit skip', () => {
    expect(shouldShowSettingsPwaInstall(false)).toBe(false);
  });

  it('shows after skip in browser', () => {
    expect(shouldShowSettingsPwaInstall(true)).toBe(true);
  });

  it('hides in native Capacitor app', () => {
    isNativePlatform.mockReturnValue(true);
    expect(shouldShowSettingsPwaInstall(true)).toBe(false);
  });

  it('hides when already running as installed PWA', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('standalone'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
    expect(shouldShowSettingsPwaInstall(true)).toBe(false);
  });
});

describe('getOpenInChromeHref', () => {
  it('targets Chrome package without https fallback (Yandex reopens itself)', () => {
    const href = getOpenInChromeHref(
      'https://ai-food-mobile.vercel.app/onboarding',
    );
    expect(href).toContain('package=com.android.chrome');
    expect(href).toContain('intent://ai-food-mobile.vercel.app/onboarding');
    expect(href).not.toContain('S.browser_fallback_url');
  });
});
