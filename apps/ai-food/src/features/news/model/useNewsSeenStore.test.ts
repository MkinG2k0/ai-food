import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  },
}));

import { useNewsSeenStore } from './useNewsSeenStore';

beforeEach(async () => {
  await act(async () => {
    await useNewsSeenStore.persist.rehydrate();
  });
  useNewsSeenStore.setState({ lastSeenDate: null });
});

describe('useNewsSeenStore', () => {
  it('starts with no dismissed release', () => {
    expect(useNewsSeenStore.getState().lastSeenDate).toBeNull();
  });

  it('remembers the dismissed release date', () => {
    act(() => {
      useNewsSeenStore.getState().dismissLatest('2026-08-19');
    });
    expect(useNewsSeenStore.getState().lastSeenDate).toBe('2026-08-19');
  });
});
