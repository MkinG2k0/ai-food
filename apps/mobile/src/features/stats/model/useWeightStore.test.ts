import { beforeEach, describe, expect, it } from 'vitest';
import { latestWeightKg, useWeightStore } from './useWeightStore';

describe('useWeightStore', () => {
  beforeEach(() => {
    useWeightStore.setState({ entries: [], goalKg: null });
  });

  it('adds a weight entry for a day and replaces same-day log', () => {
    const day = new Date(2026, 6, 16, 12);
    useWeightStore.getState().addEntry(70.5, day);
    useWeightStore.getState().addEntry(71, day);

    const { entries } = useWeightStore.getState();
    expect(entries).toHaveLength(1);
    expect(entries[0].kg).toBe(71);
    expect(entries[0].date).toBe('2026-07-16');
  });

  it('keeps entries sorted by date', () => {
    useWeightStore.getState().addEntry(70, new Date(2026, 6, 18));
    useWeightStore.getState().addEntry(69, new Date(2026, 6, 10));

    expect(useWeightStore.getState().entries.map((e) => e.date)).toEqual([
      '2026-07-10',
      '2026-07-18',
    ]);
  });

  it('seeds goalKg only once via ensureGoalKg', () => {
    useWeightStore.getState().ensureGoalKg(65);
    useWeightStore.getState().ensureGoalKg(80);
    expect(useWeightStore.getState().goalKg).toBe(65);
  });
});

describe('latestWeightKg', () => {
  it('returns last entry or fallback', () => {
    expect(latestWeightKg([], 72)).toBe(72);
    expect(
      latestWeightKg(
        [
          { id: '1', date: '2026-07-10', kg: 70 },
          { id: '2', date: '2026-07-16', kg: 69.2 },
        ],
        72,
      ),
    ).toBe(69.2);
  });
});
