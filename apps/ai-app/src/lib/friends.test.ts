import { describe, expect, it, vi } from 'vitest';
import {
  parseSharePhotosToFriends,
  parseStreakLength,
  resolveFriendTarget,
  sortFriendsByStreakDesc,
  allowsDevSelfFriendRequest,
  sumMealMacros,
  uniqueWeightsByDate,
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
});

describe('parseStreakLength', () => {
  it('reads currentLength from clientStreak json', () => {
    expect(parseStreakLength({ currentLength: 7 })).toBe(7);
    expect(parseStreakLength(null)).toBe(0);
  });
});

describe('sortFriendsByStreakDesc', () => {
  it('sorts by streak descending', () => {
    const sorted = sortFriendsByStreakDesc([
      { userId: 'a', displayName: 'A', username: null, streak: 2 },
      { userId: 'b', displayName: 'B', username: null, streak: 10 },
      { userId: 'c', displayName: 'C', username: null, streak: 5 },
    ]);
    expect(sorted.map((f) => f.userId)).toEqual(['b', 'c', 'a']);
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
