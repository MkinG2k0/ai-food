import { beforeEach, describe, expect, it, vi } from 'vitest';

const isNativePlatform = vi.fn(() => false);
const setStyle = vi.fn((_options: unknown) => Promise.resolve());
const setBackgroundColor = vi.fn((_options: unknown) => Promise.resolve());

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => isNativePlatform(),
    },
  registerPlugin: vi.fn(() => ({})),
}));

vi.mock('@capacitor/status-bar', () => ({
  StatusBar: {
    setStyle: (options: unknown) => setStyle(options),
    setBackgroundColor: (options: unknown) => setBackgroundColor(options),
  },
  Style: {
    Dark: 'DARK',
    Light: 'LIGHT',
    Default: 'DEFAULT',
  },
}));

describe('configureStatusBar', () => {
  beforeEach(() => {
    vi.resetModules();
    isNativePlatform.mockReset();
    setStyle.mockReset();
    setBackgroundColor.mockReset();
    setStyle.mockResolvedValue(undefined);
    setBackgroundColor.mockResolvedValue(undefined);
    document.documentElement.classList.remove('dark');
  });

  it('does nothing on web', async () => {
    isNativePlatform.mockReturnValue(false);
    const { configureStatusBar } = await import('./configureStatusBar');
    await configureStatusBar();
    expect(setStyle).not.toHaveBeenCalled();
    expect(setBackgroundColor).not.toHaveBeenCalled();
  });

  it('sets Light style and white background for light theme', async () => {
    isNativePlatform.mockReturnValue(true);
    const { configureStatusBar } = await import('./configureStatusBar');
    await configureStatusBar('light');
    expect(setStyle).toHaveBeenCalledWith({ style: 'LIGHT' });
    expect(setBackgroundColor).toHaveBeenCalledWith({ color: '#ffffff' });
  });

  it('sets Dark style and dark background for dark theme', async () => {
    isNativePlatform.mockReturnValue(true);
    const { configureStatusBar } = await import('./configureStatusBar');
    await configureStatusBar('dark');
    expect(setStyle).toHaveBeenCalledWith({ style: 'DARK' });
    expect(setBackgroundColor).toHaveBeenCalledWith({ color: '#09090b' });
  });

  it('reads html.dark when theme arg omitted', async () => {
    isNativePlatform.mockReturnValue(true);
    document.documentElement.classList.add('dark');
    const { configureStatusBar } = await import('./configureStatusBar');
    await configureStatusBar();
    expect(setStyle).toHaveBeenCalledWith({ style: 'DARK' });
    expect(setBackgroundColor).toHaveBeenCalledWith({ color: '#09090b' });
  });

  it('still succeeds if setBackgroundColor rejects', async () => {
    isNativePlatform.mockReturnValue(true);
    setBackgroundColor.mockRejectedValue(new Error('unsupported'));
    const { configureStatusBar } = await import('./configureStatusBar');
    await expect(configureStatusBar('light')).resolves.toBeUndefined();
    expect(setStyle).toHaveBeenCalled();
  });
});
