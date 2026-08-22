import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const hooks = vi.hoisted(() => {
  const callbacks = {
    hydrate: undefined as (() => void) | undefined,
    finish: undefined as (() => void) | undefined,
  };
  const persistMock = {
    hasHydrated: vi.fn(() => false),
    onHydrate: vi.fn((cb: () => void) => {
      callbacks.hydrate = cb;
      return vi.fn();
    }),
    onFinishHydration: vi.fn((cb: () => void) => {
      callbacks.finish = cb;
      return vi.fn();
    }),
  };
  return { callbacks, persistMock };
});

vi.mock('./useAuthStore', () => ({
  useAuthStore: { persist: hooks.persistMock },
}));

import { useAuthHydrated } from './useAuthHydrated';

describe('useAuthHydrated', () => {
  it('starts false when persist has not hydrated', () => {
    hooks.persistMock.hasHydrated.mockReturnValue(false);
    const { result } = renderHook(() => useAuthHydrated());
    expect(result.current).toBe(false);
  });

  it('starts true when persist is already hydrated', () => {
    hooks.persistMock.hasHydrated.mockReturnValue(true);
    const { result } = renderHook(() => useAuthHydrated());
    expect(result.current).toBe(true);
  });

  it('reacts to hydrate and finish hydration events', () => {
    hooks.persistMock.hasHydrated.mockReturnValue(true);
    const { result } = renderHook(() => useAuthHydrated());
    expect(result.current).toBe(true);

    act(() => {
      hooks.callbacks.hydrate?.();
    });
    expect(result.current).toBe(false);

    act(() => {
      hooks.callbacks.finish?.();
    });
    expect(result.current).toBe(true);
  });

  it('unsubscribes on unmount', () => {
    const unsubHydrate = vi.fn();
    const unsubFinish = vi.fn();
    hooks.persistMock.onHydrate.mockReturnValueOnce(unsubHydrate);
    hooks.persistMock.onFinishHydration.mockReturnValueOnce(unsubFinish);

    const { unmount } = renderHook(() => useAuthHydrated());
    unmount();

    expect(unsubHydrate).toHaveBeenCalled();
    expect(unsubFinish).toHaveBeenCalled();
  });
});
