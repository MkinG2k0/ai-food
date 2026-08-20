import { describe, it, expect, beforeEach, vi } from 'vitest';

const isNativePlatform = vi.fn(() => false);

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => isNativePlatform(),
  },
}));

import { shouldOfferPwaInstall } from './pwaInstallEnv';

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
