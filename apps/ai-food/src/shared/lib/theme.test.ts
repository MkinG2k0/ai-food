import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  applyThemePreference,
  isDarkResolved,
  isThemePreference,
  readStoredTheme,
  resolveTheme,
  THEME_STORAGE_KEY,
  writeStoredTheme,
} from './theme';

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark', 'theme-forest');
    document.documentElement.style.colorScheme = '';
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('validates preference values', () => {
    expect(isThemePreference('light')).toBe(true);
    expect(isThemePreference('dark')).toBe(true);
    expect(isThemePreference('forest')).toBe(true);
    expect(isThemePreference('system')).toBe(true);
    expect(isThemePreference('auto')).toBe(false);
  });

  it('persists and reads preference', () => {
    writeStoredTheme('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(readStoredTheme()).toBe('dark');
  });

  it('defaults to system when unset', () => {
    expect(readStoredTheme()).toBe('system');
  });

  it('applies dark class for dark preference', () => {
    const resolved = applyThemePreference('dark');
    expect(resolved).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('theme-forest')).toBe(
      false,
    );
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('applies forest classes for forest preference', () => {
    const resolved = applyThemePreference('forest');
    expect(resolved).toBe('forest');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('theme-forest')).toBe(
      true,
    );
    expect(isDarkResolved(resolved)).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('applies light class for light preference', () => {
    document.documentElement.classList.add('dark', 'theme-forest');
    const resolved = applyThemePreference('light');
    expect(resolved).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.classList.contains('theme-forest')).toBe(
      false,
    );
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('resolves system from matchMedia', () => {
    const matchMedia = vi.fn().mockReturnValue({ matches: true });
    vi.stubGlobal('matchMedia', matchMedia);
    expect(resolveTheme('system')).toBe('dark');
    vi.unstubAllGlobals();
  });
});
