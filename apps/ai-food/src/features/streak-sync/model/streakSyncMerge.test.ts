import { describe, expect, it } from 'vitest';
import { applyStreakSyncResponse, mergeStreakLww } from './streakSyncMerge';

const local = {
  streak: {
    currentLength: 3,
    freezeCount: 0,
    consumedFreezeDateKeys: [],
    grantedMilestones: [],
    lastCelebratedLocalDate: '',
    bestStreak: 3,
  },
  clientUpdatedAt: '2026-08-18T10:00:00.000Z',
};

describe('mergeStreakLww', () => {
  it('remote wins when newer', () => {
    const remote = {
      streak: { ...local.streak, bestStreak: 10 },
      clientUpdatedAt: '2026-08-18T12:00:00.000Z',
    };
    expect(mergeStreakLww(local, remote).streak.bestStreak).toBe(10);
  });

  it('local wins when newer', () => {
    const remote = {
      streak: { ...local.streak, bestStreak: 10 },
      clientUpdatedAt: '2026-08-18T08:00:00.000Z',
    };
    expect(mergeStreakLww(local, remote).streak.bestStreak).toBe(3);
  });
});

describe('applyStreakSyncResponse', () => {
  it('uses server LWW result', () => {
    const response = {
      streak: { ...local.streak, freezeCount: 2 },
      clientUpdatedAt: '2026-08-18T11:00:00.000Z',
    };
    expect(applyStreakSyncResponse(local, response).streak.freezeCount).toBe(2);
  });
});
