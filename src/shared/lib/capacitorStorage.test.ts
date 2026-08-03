import { describe, it, expect, vi, beforeEach } from 'vitest';

const get = vi.fn();
const set = vi.fn();
const remove = vi.fn();

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: (...args: unknown[]) => get(...args),
    set: (...args: unknown[]) => set(...args),
    remove: (...args: unknown[]) => remove(...args),
  },
}));

import { capacitorStorage } from './capacitorStorage';

describe('capacitorStorage', () => {
  beforeEach(() => {
    get.mockReset();
    set.mockReset();
    remove.mockReset();
    localStorage.clear();
  });

  it('reads from Preferences when value exists', async () => {
    get.mockResolvedValue({ value: '{"state":{"meals":[]}}' });

    const value = await capacitorStorage.getItem('ai-food-diary');

    expect(get).toHaveBeenCalledWith({ key: 'ai-food-diary' });
    expect(value).toBe('{"state":{"meals":[]}}');
    expect(set).not.toHaveBeenCalled();
  });

  it('migrates legacy localStorage on first Preferences miss', async () => {
    get.mockResolvedValue({ value: null });
    localStorage.setItem('ai-food-diary', '{"state":{"meals":[{"id":"1"}]}}');
    set.mockResolvedValue(undefined);

    const value = await capacitorStorage.getItem('ai-food-diary');

    expect(value).toBe('{"state":{"meals":[{"id":"1"}]}}');
    expect(set).toHaveBeenCalledWith({
      key: 'ai-food-diary',
      value: '{"state":{"meals":[{"id":"1"}]}}',
    });
    expect(localStorage.getItem('ai-food-diary')).toBeNull();
  });

  it('returns null when Preferences and localStorage are empty', async () => {
    get.mockResolvedValue({ value: null });

    const value = await capacitorStorage.getItem('ai-food-diary');

    expect(value).toBeNull();
  });

  it('writes via Preferences.set', async () => {
    set.mockResolvedValue(undefined);

    await capacitorStorage.setItem('ai-food-diary', '{"state":{"meals":[]}}');

    expect(set).toHaveBeenCalledWith({
      key: 'ai-food-diary',
      value: '{"state":{"meals":[]}}',
    });
  });

  it('removes from Preferences and legacy localStorage', async () => {
    remove.mockResolvedValue(undefined);
    localStorage.setItem('ai-food-diary', 'legacy');

    await capacitorStorage.removeItem('ai-food-diary');

    expect(remove).toHaveBeenCalledWith({ key: 'ai-food-diary' });
    expect(localStorage.getItem('ai-food-diary')).toBeNull();
  });
});
