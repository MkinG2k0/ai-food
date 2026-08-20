import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  },
}));

import { usePwaInstallSeenStore } from './usePwaInstallSeenStore';

beforeEach(async () => {
  await act(async () => {
    await usePwaInstallSeenStore.persist.rehydrate();
  });
  usePwaInstallSeenStore.setState({ dismissed: false });
});

describe('usePwaInstallSeenStore', () => {
  it('starts not dismissed', () => {
    expect(usePwaInstallSeenStore.getState().dismissed).toBe(false);
  });

  it('remembers dismiss', () => {
    act(() => {
      usePwaInstallSeenStore.getState().dismiss();
    });
    expect(usePwaInstallSeenStore.getState().dismissed).toBe(true);
  });
});
