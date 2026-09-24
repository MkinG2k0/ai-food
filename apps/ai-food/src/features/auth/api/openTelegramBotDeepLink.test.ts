import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const isNativePlatform = vi.fn(() => false);
const browserOpen = vi.fn(async () => undefined);

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => isNativePlatform(),
  },
}));

vi.mock('@capacitor/browser', () => ({
  Browser: {
    open: (...args: unknown[]) => browserOpen(...args),
  },
}));

describe('prepareTelegramLoginPopup', () => {
  beforeEach(() => {
    isNativePlatform.mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the window from window.open(about:blank)', async () => {
    const { prepareTelegramLoginPopup } = await import('./openTelegramBotDeepLink');
    const popup = { closed: false } as Window;
    vi.spyOn(window, 'open').mockReturnValue(popup);

    expect(prepareTelegramLoginPopup()).toBe(popup);
    expect(window.open).toHaveBeenCalledWith('about:blank', '_blank');
  });

  it('returns null when open is blocked', async () => {
    const { prepareTelegramLoginPopup } = await import('./openTelegramBotDeepLink');
    vi.spyOn(window, 'open').mockReturnValue(null);
    expect(prepareTelegramLoginPopup()).toBeNull();
  });

  it('skips about:blank on Capacitor native', async () => {
    isNativePlatform.mockReturnValue(true);
    const openSpy = vi.spyOn(window, 'open');
    const { prepareTelegramLoginPopup } = await import('./openTelegramBotDeepLink');

    expect(prepareTelegramLoginPopup()).toBeNull();
    expect(openSpy).not.toHaveBeenCalled();
  });
});

describe('openTelegramBotDeepLink', () => {
  beforeEach(() => {
    isNativePlatform.mockReturnValue(false);
    browserOpen.mockReset();
    browserOpen.mockResolvedValue(undefined);
    vi.restoreAllMocks();
  });

  it('navigates a live pre-opened popup', async () => {
    const { openTelegramBotDeepLink } = await import('./openTelegramBotDeepLink');
    const popup = {
      closed: false,
      location: { href: 'about:blank' },
      opener: {} as Window,
      close: vi.fn(),
    };
    const result = await openTelegramBotDeepLink(
      'https://t.me/bot?start=x',
      popup as unknown as Window,
    );
    expect(result).toBe('opened');
    expect(popup.location.href).toBe('https://t.me/bot?start=x');
    expect(popup.opener).toBeNull();
  });

  it('falls back to window.open when popup is missing', async () => {
    const { openTelegramBotDeepLink } = await import('./openTelegramBotDeepLink');
    const win = { closed: false, opener: {} as Window };
    vi.spyOn(window, 'open').mockReturnValue(win as unknown as Window);

    expect(await openTelegramBotDeepLink('https://t.me/bot?start=x')).toBe(
      'opened',
    );
    expect(window.open).toHaveBeenCalledWith(
      'https://t.me/bot?start=x',
      '_blank',
    );
    expect(win.opener).toBeNull();
  });

  it('returns blocked when no window can be opened', async () => {
    const { openTelegramBotDeepLink } = await import('./openTelegramBotDeepLink');
    vi.spyOn(window, 'open').mockReturnValue(null);
    expect(await openTelegramBotDeepLink('https://t.me/bot?start=x')).toBe(
      'blocked',
    );
  });

  it('returns blocked and closes popup when location assign throws', async () => {
    const { openTelegramBotDeepLink } = await import('./openTelegramBotDeepLink');
    const popup = {
      closed: false,
      location: {
        set href(_v: string) {
          throw new Error('blocked');
        },
      },
      close: vi.fn(),
    };
    vi.spyOn(window, 'open').mockReturnValue(null);

    expect(
      await openTelegramBotDeepLink(
        'https://t.me/bot?start=x',
        popup as unknown as Window,
      ),
    ).toBe('blocked');
    expect(popup.close).toHaveBeenCalled();
  });

  it('opens via Capacitor Browser on native', async () => {
    isNativePlatform.mockReturnValue(true);
    const { openTelegramBotDeepLink } = await import('./openTelegramBotDeepLink');

    expect(await openTelegramBotDeepLink('https://t.me/bot?start=x')).toBe(
      'opened',
    );
    expect(browserOpen).toHaveBeenCalledWith({
      url: 'https://t.me/bot?start=x',
    });
  });

  it('returns blocked when Capacitor Browser.open throws', async () => {
    isNativePlatform.mockReturnValue(true);
    browserOpen.mockRejectedValue(new Error('no browser'));
    const { openTelegramBotDeepLink } = await import('./openTelegramBotDeepLink');

    expect(await openTelegramBotDeepLink('https://t.me/bot?start=x')).toBe(
      'blocked',
    );
  });
});
