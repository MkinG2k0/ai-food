import type { ApiError } from '@ai-food/shared-types';
import { getQuotaHeaders } from '@/features/auth';

function gatewayBase(): string {
  const url = import.meta.env.VITE_AI_GATEWAY_URL as string | undefined;
  if (!url?.trim()) {
    throw new Error('VITE_AI_GATEWAY_URL не задан');
  }
  return url.replace(/\/$/, '');
}

async function parseError(res: Response): Promise<never> {
  const data = (await res.json().catch(() => ({}))) as {
    message?: string;
    code?: string;
    status?: number;
  };
  const err: ApiError = {
    message: data.message ?? `Friends error ${res.status}`,
    code: data.code ?? 'FRIENDS_ERROR',
    status: data.status ?? res.status,
  };
  throw err;
}

export type FriendSummary = {
  userId: string;
  displayName: string;
  username: string | null;
  streak: number;
  photoUrl?: string;
};

export type FriendRequestItem = {
  requestId: string;
  userId: string;
  displayName: string;
  username: string | null;
  createdAt: string;
};

export type FriendRequestsResponse = {
  incoming: FriendRequestItem[];
  outgoing: FriendRequestItem[];
};

export type FriendProfileMeal = {
  id: string;
  timestamp: string;
  name: string | null;
  totalCalories: number;
  protein: number;
  fat: number;
  carbs: number;
};

export type FriendProfile = {
  userId: string;
  displayName: string;
  streak: number;
  goalKg: number | null;
  weightKg: number | null;
  weights: { date: string; kg: number }[];
  targets: {
    kcal: number;
    protein: number;
    fat: number;
    carbs: number;
    fiber?: number;
  } | null;
  sharePhotosToFriends: boolean;
  meals: FriendProfileMeal[];
};

export async function requestFriend(query: string): Promise<{
  requestId: string;
  status: 'pending';
}> {
  const headers = await getQuotaHeaders('other');
  const res = await fetch(`${gatewayBase()}/user/friends/request`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) await parseError(res);
  return (await res.json()) as { requestId: string; status: 'pending' };
}

export async function fetchFriends(): Promise<{ friends: FriendSummary[] }> {
  const headers = await getQuotaHeaders('other');
  const res = await fetch(`${gatewayBase()}/user/friends`, {
    method: 'GET',
    headers,
  });
  if (!res.ok) await parseError(res);
  return (await res.json()) as { friends: FriendSummary[] };
}

export async function fetchFriendRequests(): Promise<FriendRequestsResponse> {
  const headers = await getQuotaHeaders('other');
  const res = await fetch(`${gatewayBase()}/user/friends/requests`, {
    method: 'GET',
    headers,
  });
  if (!res.ok) await parseError(res);
  return (await res.json()) as FriendRequestsResponse;
}

export async function acceptFriendRequest(requestId: string): Promise<void> {
  const headers = await getQuotaHeaders('other');
  const res = await fetch(
    `${gatewayBase()}/user/friends/requests/${encodeURIComponent(requestId)}/accept`,
    { method: 'POST', headers },
  );
  if (!res.ok) await parseError(res);
}

export async function declineFriendRequest(requestId: string): Promise<void> {
  const headers = await getQuotaHeaders('other');
  const res = await fetch(
    `${gatewayBase()}/user/friends/requests/${encodeURIComponent(requestId)}/decline`,
    { method: 'POST', headers },
  );
  if (!res.ok) await parseError(res);
}

export async function fetchFriendProfile(userId: string): Promise<FriendProfile> {
  const headers = await getQuotaHeaders('other');
  const res = await fetch(
    `${gatewayBase()}/user/friends/${encodeURIComponent(userId)}/profile`,
    { method: 'GET', headers },
  );
  if (!res.ok) await parseError(res);
  const data = (await res.json()) as FriendProfile;
  return {
    ...data,
    weights: Array.isArray(data.weights) ? data.weights : [],
  };
}
