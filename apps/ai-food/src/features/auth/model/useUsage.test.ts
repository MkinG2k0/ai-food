import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockSnapshot = {
  remaining: 42,
  limit: 50,
  used: 8,
  authenticated: false,
  freeGenerationLimit: 50,
  authLoginGenerationBonus: 100,
};

vi.mock('../api/fetchUsage', () => ({
  fetchUsage: vi.fn(),
  getCachedUsage: vi.fn(() => mockSnapshot),
  usageQueryKey: ['usage'] as const,
}));

vi.mock('./useAuthStore', () => ({
  useAuthStore: vi.fn(),
}));

import { fetchUsage, getCachedUsage, usageQueryKey } from '../api/fetchUsage';
import { useAuthStore } from './useAuthStore';
import { useUsage } from './useUsage';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useUsage', () => {
  beforeEach(() => {
    vi.mocked(fetchUsage).mockResolvedValue({
      remaining: 40,
      limit: 50,
      used: 10,
      authenticated: false,
      freeGenerationLimit: 50,
      authLoginGenerationBonus: 100,
    });
    vi.mocked(useAuthStore).mockImplementation((selector) =>
      selector({
        session: { id: 'session-1' },
        userToken: 'jwt',
      } as never),
    );
  });

  it('seeds query with cached usage and refreshes from fetchUsage', async () => {
    const { result } = renderHook(() => useUsage(), { wrapper: createWrapper() });

    expect(getCachedUsage).toHaveBeenCalled();
    expect(result.current.data).toEqual(mockSnapshot);

    await waitFor(() => expect(fetchUsage).toHaveBeenCalled());
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data?.remaining).toBe(40);
  });

  it('includes session id and token flag in query key', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    renderHook(() => useUsage(), { wrapper });

    await waitFor(() => {
      const queries = queryClient.getQueryCache().findAll();
      expect(queries.some((q) => q.queryKey[0] === usageQueryKey[0])).toBe(true);
      expect(queries.some((q) => q.queryKey.includes('session-1'))).toBe(true);
      expect(queries.some((q) => q.queryKey.includes(true))).toBe(true);
    });
  });

  it('uses guest cache when no token', async () => {
    vi.mocked(useAuthStore).mockImplementation((selector) =>
      selector({
        session: null,
        userToken: null,
      } as never),
    );

    const { result } = renderHook(() => useUsage(), { wrapper: createWrapper() });

    expect(result.current.data).toEqual(mockSnapshot);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
