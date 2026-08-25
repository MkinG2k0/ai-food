import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  openTelegramBotDeepLink,
  prepareTelegramLoginPopup,
} from './openTelegramBotDeepLink';

describe('prepareTelegramLoginPopup', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the window from window.open(about:blank)', () => {
    const popup = { closed: false } as Window;
    vi.spyOn(window, 'open').mockReturnValue(popup);

    expect(prepareTelegramLoginPopup()).toBe(popup);
    expect(window.open).toHaveBeenCalledWith('about:blank', '_blank');
  });

  it('returns null when open is blocked', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    expect(prepareTelegramLoginPopup()).toBeNull();
  });
});

describe('openTelegramBotDeepLink', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('navigates a live pre-opened popup', () => {
    const popup = {
      closed: false,
      location: { href: 'about:blank' },
      opener: {} as Window,
      close: vi.fn(),
    };
    const result = openTelegramBotDeepLink(
      'https://t.me/bot?start=x',
      popup as unknown as Window,
    );
    expect(result).toBe('opened');
    expect(popup.location.href).toBe('https://t.me/bot?start=x');
    expect(popup.opener).toBeNull();
  });

  it('falls back to window.open when popup is missing', () => {
    const win = { closed: false, opener: {} as Window };
    vi.spyOn(window, 'open').mockReturnValue(win as unknown as Window);

    expect(openTelegramBotDeepLink('https://t.me/bot?start=x')).toBe('opened');
    expect(window.open).toHaveBeenCalledWith(
      'https://t.me/bot?start=x',
      '_blank',
    );
    expect(win.opener).toBeNull();
  });

  it('returns blocked when no window can be opened', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    expect(openTelegramBotDeepLink('https://t.me/bot?start=x')).toBe('blocked');
  });

  it('returns blocked and closes popup when location assign throws', () => {
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
      openTelegramBotDeepLink(
        'https://t.me/bot?start=x',
        popup as unknown as Window,
      ),
    ).toBe('blocked');
    expect(popup.close).toHaveBeenCalled();
  });
});
