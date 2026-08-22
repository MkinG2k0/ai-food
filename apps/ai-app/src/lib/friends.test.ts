import { describe, expect, it, vi } from 'vitest';
import {
  parseSharePhotosToFriends,
  parseStreakLength,
  parseCalorieStreakLength,
  resolveFriendTarget,
  sortFriendsByStreakDesc,
  allowsDevSelfFriendRequest,
  sumMealMacros,
  uniqueWeightsByDate,
  listAcceptedFriends,
  displayName,
  assertFriendship,
  buildFriendProfile,
} from './friends.js';

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findFirst: vi.fn(),
}));

function prismaMock() {
  return {
    user: {
      findUnique: mocks.findUnique,
      findFirst: mocks.findFirst,
    },
  } as never;
}

describe('displayName', () => {
  it('prefers firstName, then @username, then fallback', () => {
    expect(displayName({ firstName: ' Alice ', username: 'bob' })).toBe('Alice');
    expect(displayName({ firstName: null, username: '@carol' })).toBe('@carol');
    expect(displayName({ firstName: '  ', username: '  ' })).toBe('Пользователь');
  });
});

describe('resolveFriendTarget', () => {
  it('finds user by numeric telegram id', async () => {
    mocks.findUnique.mockResolvedValue({
      id: 'u1',
      username: 'alice',
      firstName: 'Alice',
      photoUrl: null,
      telegramId: '12345',
    });

    const result = await resolveFriendTarget(prismaMock(), '12345');
    expect(result?.id).toBe('u1');
    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { telegramId: '12345' },
      select: expect.any(Object),
    });
  });

  it('finds user by @username case-insensitively', async () => {
    mocks.findFirst.mockResolvedValue({
      id: 'u2',
      username: 'Bob',
      firstName: null,
      photoUrl: null,
      telegramId: '99',
    });

    const result = await resolveFriendTarget(prismaMock(), '@bob');
    expect(result?.id).toBe('u2');
    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: { username: { equals: 'bob', mode: 'insensitive' } },
      select: expect.any(Object),
    });
  });

  it('returns null for empty query', async () => {
    expect(await resolveFriendTarget(prismaMock(), '  ')).toBeNull();
  });

  it('finds user by plain username without @', async () => {
    mocks.findFirst.mockResolvedValue({
      id: 'u3',
      username: 'dave',
      firstName: null,
      photoUrl: null,
      telegramId: '77',
    });

    const result = await resolveFriendTarget(prismaMock(), 'dave');
    expect(result?.id).toBe('u3');
  });
});

describe('assertFriendship', () => {
  it('returns true when accepted request exists', async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: 'fr-1' });
    await expect(
      assertFriendship({ friendRequest: { findFirst } } as never, 'a', 'b'),
    ).resolves.toBe(true);
  });

  it('returns false when no accepted request', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    await expect(
      assertFriendship({ friendRequest: { findFirst } } as never, 'a', 'b'),
    ).resolves.toBe(false);
  });
});

describe('parseStreakLength', () => {
  it('reads currentLength from clientStreak json', () => {
    expect(parseStreakLength({ currentLength: 7 })).toBe(7);
    expect(parseStreakLength(null)).toBe(0);
    expect(parseStreakLength({ currentLength: -3.2 })).toBe(0);
    expect(parseStreakLength({ currentLength: Number.NaN })).toBe(0);
  });
});

describe('parseCalorieStreakLength', () => {
  it('reads nested currentLength and defaults missing clientStreak to 0', () => {
    expect(
      parseCalorieStreakLength({
        currentLength: 3,
        calorieStreak: { currentLength: 11 },
      }),
    ).toBe(11);
    expect(parseCalorieStreakLength(null)).toBe(0);
    expect(parseCalorieStreakLength({ currentLength: 3 })).toBe(0);
  });
});

describe('sortFriendsByStreakDesc', () => {
  it('sorts by streak descending', () => {
    const sorted = sortFriendsByStreakDesc([
      { userId: 'a', displayName: 'A', username: null, streak: 2, calorieStreak: 0, goalKg: null, weightKg: null },
      { userId: 'b', displayName: 'B', username: null, streak: 10, calorieStreak: 0, goalKg: null, weightKg: null },
      { userId: 'c', displayName: 'C', username: null, streak: 5, calorieStreak: 0, goalKg: null, weightKg: null },
    ]);
    expect(sorted.map((f) => f.userId)).toEqual(['b', 'c', 'a']);
  });

  it('does not sort by calorieStreak', () => {
    const sorted = sortFriendsByStreakDesc([
      { userId: 'a', displayName: 'A', username: null, streak: 2, calorieStreak: 50, goalKg: null, weightKg: null },
      { userId: 'b', displayName: 'B', username: null, streak: 10, calorieStreak: 1, goalKg: 70, weightKg: 75 },
    ]);
    expect(sorted.map((f) => f.userId)).toEqual(['b', 'a']);
  });
});

describe('sumMealMacros', () => {
  it('sums protein fat carbs from items array', () => {
    expect(
      sumMealMacros([
        { protein: 10, fat: 5, carbs: 20 },
        { protein: 2, fat: 1, carbs: 3 },
      ]),
    ).toEqual({ protein: 12, fat: 6, carbs: 23 });
  });

  it('returns zeros for non-array input', () => {
    expect(sumMealMacros(null)).toEqual({ protein: 0, fat: 0, carbs: 0 });
  });
});

describe('buildFriendProfile', () => {
  it('maps meals, weights, targets and sharePhotos flag', async () => {
    const mealTimestamp = new Date('2026-08-20T12:00:00.000Z');
    const findUnique = vi.fn().mockResolvedValue({
      id: 'friend-1',
      firstName: 'Friend',
      username: 'friend_user',
      clientStreak: { currentLength: 2, calorieStreak: { currentLength: 4 } },
      goalKg: 68,
      nutritionProfile: {
        targets: { kcal: 2000, protein: 120, fat: 70, carbs: 220, fiber: 25 },
      },
      clientSettings: { sharePhotosToFriends: false },
    });
    const mealFindMany = vi.fn().mockResolvedValue([
      {
        id: 'm1',
        timestamp: mealTimestamp,
        name: 'Lunch',
        items: [{ protein: 20, fat: 10, carbs: 30 }],
        totalCalories: 350,
      },
    ]);
    const weightFindFirst = vi.fn().mockResolvedValue({ kg: 72.5 });
    const weightFindMany = vi.fn().mockResolvedValue([
      { date: '2026-08-01', kg: 73 },
      { date: '2026-08-02', kg: 72.5 },
    ]);

    const profile = await buildFriendProfile(
      {
        user: { findUnique },
        meal: { findMany: mealFindMany },
        weightEntry: { findFirst: weightFindFirst, findMany: weightFindMany },
      } as never,
      'friend-1',
    );

    expect(profile).toMatchObject({
      userId: 'friend-1',
      displayName: 'Friend',
      streak: 2,
      calorieStreak: 4,
      goalKg: 68,
      weightKg: 72.5,
      sharePhotosToFriends: false,
      targets: { kcal: 2000, protein: 120, fat: 70, carbs: 220, fiber: 25 },
      meals: [
        {
          id: 'm1',
          name: 'Lunch',
          totalCalories: 350,
          protein: 20,
          fat: 10,
          carbs: 30,
        },
      ],
    });
    expect(profile?.weights).toEqual([
      { date: '2026-08-01', kg: 73 },
      { date: '2026-08-02', kg: 72.5 },
    ]);
  });

  it('returns null when user is missing', async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    await expect(
      buildFriendProfile({ user: { findUnique } } as never, 'missing'),
    ).resolves.toBeNull();
  });
});

describe('parseSharePhotosToFriends', () => {
  it('defaults to true when field missing', () => {
    expect(parseSharePhotosToFriends({ customInstructions: '' })).toBe(true);
  });

  it('reads explicit false', () => {
    expect(
      parseSharePhotosToFriends({
        customInstructions: '',
        customInstructionsEnabled: true,
        aiModel: 'google/gemini-3-flash-preview',
        featureVitamins: true,
        featureHealthiness: true,
        featureComposition: true,
        calendarRings: { kcal: true, protein: true, fat: false, carbs: false },
        sharePhotosToFriends: false,
      }),
    ).toBe(false);
  });
});

describe('uniqueWeightsByDate', () => {
  it('keeps the last kg for a repeated date', () => {
    expect(
      uniqueWeightsByDate([
        { date: '2026-08-01', kg: 72 },
        { date: '2026-08-02', kg: 71.5 },
        { date: '2026-08-01', kg: 71.8 },
      ]),
    ).toEqual([
      { date: '2026-08-01', kg: 71.8 },
      { date: '2026-08-02', kg: 71.5 },
    ]);
  });
});

describe('listAcceptedFriends', () => {
  it('includes latest weightKg and goalKg for each friend', async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        fromUserId: 'me',
        toUserId: 'friend',
        fromUser: {
          id: 'me',
          firstName: 'Me',
          username: 'me',
          photoUrl: null,
          clientStreak: null,
          goalKg: null,
          weightEntries: [],
        },
        toUser: {
          id: 'friend',
          firstName: 'Demo',
          username: 'demo_user',
          photoUrl: null,
          clientStreak: { currentLength: 4 },
          goalKg: 70,
          weightEntries: [{ kg: 75.2 }],
        },
      },
    ]);

    const result = await listAcceptedFriends(
      { friendRequest: { findMany } } as never,
      'me',
    );

    expect(result).toEqual([
      {
        userId: 'friend',
        displayName: 'Demo',
        username: 'demo_user',
        streak: 4,
        calorieStreak: 0,
        goalKg: 70,
        weightKg: 75.2,
      },
    ]);
  });
});

describe('allowsDevSelfFriendRequest', () => {
  it('is true outside production', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    expect(allowsDevSelfFriendRequest()).toBe(true);
    process.env.NODE_ENV = 'test';
    expect(allowsDevSelfFriendRequest()).toBe(true);
    process.env.NODE_ENV = prev;
  });

  it('is false in production', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    expect(allowsDevSelfFriendRequest()).toBe(false);
    process.env.NODE_ENV = prev;
  });
});
