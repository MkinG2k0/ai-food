import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyStreakSync } from './streakSync.js';

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
}));

function prismaStub() {
  return {
    user: {
      findUnique: mocks.findUnique,
      update: mocks.update,
    },
  } as never;
}

const sampleStreak = {
  currentLength: 5,
  freezeCount: 1,
  consumedFreezeDateKeys: ['2026-08-15'],
  grantedMilestones: [7],
  lastCelebratedLocalDate: '2026-08-18',
  bestStreak: 5,
};

describe('applyStreakSync', () => {
  beforeEach(() => {
    mocks.findUnique.mockResolvedValue(null);
    mocks.update.mockResolvedValue({});
  });

  afterEach(() => vi.clearAllMocks());

  it('keeps stored calorieStreak when newer payload omits it', async () => {
    const storedCalorie = {
      currentLength: 9,
      freezeCount: 2,
      consumedFreezeDateKeys: [] as string[],
      grantedMilestones: [7, 14],
      bestStreak: 9,
    };
    mocks.findUnique.mockResolvedValue({
      clientStreak: { ...sampleStreak, calorieStreak: storedCalorie },
      streakClientUpdatedAt: new Date('2026-08-18T10:00:00.000Z'),
    });

    const result = await applyStreakSync(prismaStub(), 'user-1', {
      streak: sampleStreak,
      clientUpdatedAt: '2026-08-18T12:00:00.000Z',
    });

    expect(result.streak.calorieStreak).toEqual(storedCalorie);
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clientStreak: expect.objectContaining({
            calorieStreak: storedCalorie,
          }),
        }),
      }),
    );
  });

  it('writes incoming when stored clientStreak JSON is corrupt', async () => {
    mocks.findUnique.mockResolvedValue({
      clientStreak: { notAStreak: true },
      streakClientUpdatedAt: new Date('2026-08-18T15:00:00.000Z'),
    });

    const result = await applyStreakSync(prismaStub(), 'user-1', {
      streak: sampleStreak,
      clientUpdatedAt: '2026-08-18T12:00:00.000Z',
    });

    expect(mocks.update).toHaveBeenCalled();
    expect(result.streak.currentLength).toBe(5);
    expect(result.streak.calorieStreak).toEqual({
      currentLength: 0,
      freezeCount: 0,
      consumedFreezeDateKeys: [],
      grantedMilestones: [],
      bestStreak: 0,
    });
  });
});
