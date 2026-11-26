import { beforeEach, describe, expect, it, vi } from 'vitest';

const syncWeightsApi = vi.fn();
const getAuthState = vi.fn();

vi.mock('@/features/auth', () => ({
  useAuthStore: {
    getState: () => getAuthState(),
  },
}));

vi.mock('../api/syncWeightsApi', () => ({
  syncWeightsApi: (...args: unknown[]) => syncWeightsApi(...args),
}));

import { useWeightStore } from '@/features/stats';
import { syncWeightHistory } from './syncWeightHistory';

describe('syncWeightHistory', () => {
  beforeEach(() => {
    syncWeightsApi.mockReset();
    getAuthState.mockReturnValue({ userToken: 'jwt' });
    useWeightStore.setState({
      entries: [
        {
          id: 'w1',
          date: '2026-08-22',
          kg: 72,
          clientUpdatedAt: '2026-08-22T08:00:00.000Z',
        },
      ],
      goalKg: 70,
      pendingDeletes: [],
    });
  });

  it('no-ops without token', async () => {
    getAuthState.mockReturnValue({ userToken: null });
    await syncWeightHistory({ mode: 'full' });
    expect(syncWeightsApi).not.toHaveBeenCalled();
  });

  it('full mode posts payload and applies response', async () => {
    syncWeightsApi.mockResolvedValue({
      weights: [
        {
          id: 'w1',
          date: '2026-08-22',
          kg: 71.5,
          clientUpdatedAt: '2026-08-22T09:00:00.000Z',
        },
      ],
      tombstones: [],
      goalKg: 69,
    });

    await syncWeightHistory({ mode: 'full' });

    expect(syncWeightsApi).toHaveBeenCalledTimes(1);
    const body = syncWeightsApi.mock.calls[0][0];
    expect(body.upserts.some((u: { id: string }) => u.id === 'w1')).toBe(true);
    expect(body.deletes).toEqual([]);
    expect(body.goalKg).toBe(70);

    const state = useWeightStore.getState();
    expect(state.entries[0].kg).toBe(71.5);
    expect(state.goalKg).toBe(69);
  });

  it('full mode posts pendingDeletes and clears them after tombstone response', async () => {
    useWeightStore.setState({
      entries: [
        {
          id: 'w1',
          date: '2026-08-22',
          kg: 72,
          clientUpdatedAt: '2026-08-22T08:00:00.000Z',
        },
      ],
      goalKg: 70,
      pendingDeletes: [
        { id: 'gone', clientUpdatedAt: '2026-08-22T07:00:00.000Z' },
      ],
    });

    syncWeightsApi.mockResolvedValue({
      weights: [
        {
          id: 'w1',
          date: '2026-08-22',
          kg: 72,
          clientUpdatedAt: '2026-08-22T08:00:00.000Z',
        },
      ],
      tombstones: ['gone'],
      goalKg: 70,
    });

    await syncWeightHistory({ mode: 'full' });

    const body = syncWeightsApi.mock.calls[0][0];
    expect(body.deletes).toEqual([
      { id: 'gone', clientUpdatedAt: '2026-08-22T07:00:00.000Z' },
    ]);
    expect(body.upserts.some((u: { id: string }) => u.id === 'w1')).toBe(true);

    const state = useWeightStore.getState();
    expect(state.pendingDeletes).toEqual([]);
    expect(state.entries.map((e) => e.id)).toEqual(['w1']);
  });
});
