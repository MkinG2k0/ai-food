import type { FriendRequestsResponse, FriendSummary } from '../api/friendsApi';

const FRIENDS_CACHE_KEY = 'ai-food-friends';
const REQUESTS_CACHE_KEY = 'ai-food-friend-requests';

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota / private mode
  }
}

function isFriendSummary(value: unknown): value is FriendSummary {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.userId === 'string' &&
    typeof v.displayName === 'string' &&
    (v.username === null || typeof v.username === 'string') &&
    typeof v.streak === 'number'
  );
}

function isFriendRequestItem(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.requestId === 'string' &&
    typeof v.userId === 'string' &&
    typeof v.displayName === 'string'
  );
}

export function getCachedFriends(): FriendSummary[] | undefined {
  const parsed = readJson(FRIENDS_CACHE_KEY);
  if (!Array.isArray(parsed) || !parsed.every(isFriendSummary)) return undefined;
  return parsed;
}

export function setCachedFriends(friends: FriendSummary[]): void {
  writeJson(FRIENDS_CACHE_KEY, friends);
}

export function getCachedFriendRequests(): FriendRequestsResponse | undefined {
  const parsed = readJson(REQUESTS_CACHE_KEY);
  if (!parsed || typeof parsed !== 'object') return undefined;
  const v = parsed as Record<string, unknown>;
  if (!Array.isArray(v.incoming) || !Array.isArray(v.outgoing)) return undefined;
  if (!v.incoming.every(isFriendRequestItem) || !v.outgoing.every(isFriendRequestItem)) {
    return undefined;
  }
  return parsed as FriendRequestsResponse;
}

export function setCachedFriendRequests(requests: FriendRequestsResponse): void {
  writeJson(REQUESTS_CACHE_KEY, requests);
}

export function clearFriendsCache(): void {
  try {
    localStorage.removeItem(FRIENDS_CACHE_KEY);
    localStorage.removeItem(REQUESTS_CACHE_KEY);
  } catch {
    // ignore
  }
}

/** Keep previous order, update known rows, append newcomers. */
export function mergeFriendLists(
  prev: FriendSummary[],
  next: FriendSummary[],
): FriendSummary[] {
  const nextById = new Map(next.map((friend) => [friend.userId, friend]));
  const seen = new Set<string>();
  const merged: FriendSummary[] = [];

  for (const friend of prev) {
    const updated = nextById.get(friend.userId);
    if (!updated) continue;
    merged.push(updated);
    seen.add(friend.userId);
  }

  for (const friend of next) {
    if (!seen.has(friend.userId)) merged.push(friend);
  }

  return merged;
}
