import { describe, expect, it } from 'vitest';
import type { WeightEntry } from '@/features/stats';
import {
  applyWeightSyncResponse,
  buildWeightSyncPayload,
  mergeWeightsLww,
} from './weightSyncMerge';

function entry(
  id: string,
  date: string,
  kg: number,
  clientUpdatedAt: string,
): WeightEntry {
  return { id, date, kg, clientUpdatedAt };
}

describe('mergeWeightsLww', () => {
  it('newer clock wins', () => {
    const local = [entry('a', '2026-08-13', 70, '2026-08-13T10:00:00.000Z')];
    const remote = [entry('a', '2026-08-13', 72, '2026-08-13T12:00:00.000Z')];
    expect(mergeWeightsLww(local, remote, [])[0].kg).toBe(72);
  });

  it('tombstone removes', () => {
    const local = [entry('a', '2026-08-13', 70, '2026-08-13T10:00:00.000Z')];
    expect(mergeWeightsLww(local, [], ['a'])).toHaveLength(0);
  });

  it('same day keeps newer', () => {
    const local = [
      entry('a', '2026-08-13', 70, '2026-08-13T10:00:00.000Z'),
      entry('b', '2026-08-13', 71, '2026-08-13T11:00:00.000Z'),
    ];
    const merged = mergeWeightsLww(local, [], []);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe('b');
  });
});

describe('buildWeightSyncPayload', () => {
  it('includes goalKg and clientUpdatedAt', () => {
    const body = buildWeightSyncPayload({
      mode: 'full',
      entries: [entry('a', '2026-08-13', 70, '2026-08-13T10:00:00.000Z')],
      goalKg: 65,
    });
    expect(body.goalKg).toBe(65);
    expect(body.upserts[0].clientUpdatedAt).toBe('2026-08-13T10:00:00.000Z');
  });
});

describe('applyWeightSyncResponse', () => {
  it('applies remote + tombstones', () => {
    const local = [
      entry('a', '2026-08-13', 70, '2026-08-13T10:00:00.000Z'),
      entry('b', '2026-08-14', 71, '2026-08-13T10:00:00.000Z'),
    ];
    const next = applyWeightSyncResponse(local, {
      weights: [entry('a', '2026-08-13', 72, '2026-08-13T12:00:00.000Z')],
      tombstones: ['b'],
      goalKg: 68,
    });
    expect(next.map((e) => e.id)).toEqual(['a']);
    expect(next[0].kg).toBe(72);
  });
});
