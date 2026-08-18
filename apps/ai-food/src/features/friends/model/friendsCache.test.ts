import { beforeEach, describe, expect, it } from 'vitest';
import type { FriendSummary } from '../api/friendsApi';
import {
  clearFriendsCache,
  getCachedFriendRequests,
  getCachedFriends,
  mergeFriendLists,
  setCachedFriendRequests,
  setCachedFriends,
} from './friendsCache';

const alice: FriendSummary = {
  userId: 'a',
  displayName: 'Alice',
  username: 'alice',
  streak: 2,
  calorieStreak: 0,
  goalKg: 70,
  weightKg: 72,
};
const bob: FriendSummary = {
  userId: 'b',
  displayName: 'Bob',
  username: 'bob',
  streak: 5,
  calorieStreak: 0,
  goalKg: null,
  weightKg: null,
};

describe('mergeFriendLists', () => {
  it('keeps previous order and appends newcomers', () => {
    const prev = [alice];
    const next = [
      { ...alice, streak: 3 },
      bob,
    ];
    expect(mergeFriendLists(prev, next)).toEqual([
      { ...alice, streak: 3 },
      bob,
    ]);
  });

  it('drops friends missing from the fresh list', () => {
    expect(mergeFriendLists([alice, bob], [bob])).toEqual([bob]);
  });
});

describe('friends local cache', () => {
  beforeEach(() => {
    clearFriendsCache();
  });

  it('round-trips friends and requests', () => {
    setCachedFriends([alice]);
    expect(getCachedFriends()).toEqual([alice]);

    setCachedFriendRequests({
      incoming: [
        {
          requestId: 'r1',
          userId: 'b',
          displayName: 'Bob',
          username: 'bob',
          createdAt: '2026-08-18T00:00:00.000Z',
        },
      ],
      outgoing: [],
    });
    expect(getCachedFriendRequests()?.incoming).toHaveLength(1);
  });

  it('ignores corrupt payloads', () => {
    localStorage.setItem('ai-food-friends', '{not-json');
    expect(getCachedFriends()).toBeUndefined();
  });
});
