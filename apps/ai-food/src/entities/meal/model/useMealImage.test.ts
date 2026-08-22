import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib', () => ({
  getMealImageSrc: vi.fn(),
}));

import { getMealImageSrc } from '@/shared/lib';
import { useMealImage } from './useMealImage';

describe('useMealImage', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when imageUri is undefined', () => {
    const { result } = renderHook(() => useMealImage(undefined));
    expect(result.current).toBeNull();
    expect(getMealImageSrc).not.toHaveBeenCalled();
  });

  it('resolves src from getMealImageSrc', async () => {
    vi.mocked(getMealImageSrc).mockResolvedValue('blob:meal-1');

    const { result } = renderHook(() => useMealImage('meal-images/abc.jpg'));

    await waitFor(() => expect(result.current).toBe('blob:meal-1'));
    expect(getMealImageSrc).toHaveBeenCalledWith('meal-images/abc.jpg');
  });

  it('clears src when imageUri becomes empty', async () => {
    vi.mocked(getMealImageSrc).mockResolvedValue('blob:meal-1');

    const { result, rerender } = renderHook(
      ({ uri }: { uri?: string }) => useMealImage(uri),
      { initialProps: { uri: 'meal-images/a.jpg' as string | undefined } },
    );

    await waitFor(() => expect(result.current).toBe('blob:meal-1'));

    rerender({ uri: undefined });
    await waitFor(() => expect(result.current).toBeNull());
  });

  it('revokes blob object URL on unmount', async () => {
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.mocked(getMealImageSrc).mockResolvedValue('blob:temp-url');

    const { unmount } = renderHook(() => useMealImage('meal-images/x.jpg'));
    await waitFor(() => expect(getMealImageSrc).toHaveBeenCalled());

    await act(async () => {
      unmount();
    });

    expect(revokeSpy).toHaveBeenCalledWith('blob:temp-url');
    revokeSpy.mockRestore();
  });
});
