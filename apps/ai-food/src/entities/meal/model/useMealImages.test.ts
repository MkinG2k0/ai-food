import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('@/shared/lib', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/lib')>();
  return {
    ...actual,
    getMealImageSrc: vi.fn(),
  };
});

import { getMealImageSrc } from '@/shared/lib';
import { useMealImages } from './useMealImages';

const getSrc = vi.mocked(getMealImageSrc);

describe('useMealImages', () => {
  beforeEach(() => {
    getSrc.mockReset();
  });

  it('is settled immediately when there are no URIs', () => {
    const { result } = renderHook(() => useMealImages([]));
    expect(result.current).toEqual({ srcs: [], settled: true });
  });

  it('marks settled after lookups finish, including missing files', async () => {
    getSrc.mockRejectedValue(new Error('not found'));
    const { result } = renderHook(() =>
      useMealImages(['meal-images/gone.jpg']),
    );
    expect(result.current.settled).toBe(false);
    await waitFor(() => {
      expect(result.current).toEqual({ srcs: [null], settled: true });
    });
  });

  it('returns display URLs when files resolve', async () => {
    getSrc.mockResolvedValue('data:image/jpeg;base64,abc');
    const { result } = renderHook(() =>
      useMealImages(['meal-images/a.jpg']),
    );
    await waitFor(() => {
      expect(result.current).toEqual({
        srcs: ['data:image/jpeg;base64,abc'],
        settled: true,
      });
    });
  });
});
