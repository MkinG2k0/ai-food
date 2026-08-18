import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FriendRequestsResponse, FriendSummary } from '../api/friendsApi';
import {
  acceptFriendRequest,
  declineFriendRequest,
  fetchFriendProfile,
  fetchFriendRequests,
  fetchFriends,
  requestFriend,
} from '../api/friendsApi';
import {
  getCachedFriendRequests,
  getCachedFriends,
  mergeFriendLists,
  setCachedFriendRequests,
  setCachedFriends,
} from './friendsCache';

export const friendsQueryKey = ['friends'] as const;
export const friendRequestsQueryKey = ['friendRequests'] as const;

const FRIENDS_STALE_MS = 5 * 60_000;
const FRIENDS_GC_MS = 30 * 60_000;

export function friendProfileQueryKey(userId: string) {
  return ['friendProfile', userId] as const;
}

export function useFriendsList(enabled = true) {
  const queryClient = useQueryClient();
  const cached = getCachedFriends();

  return useQuery({
    queryKey: friendsQueryKey,
    queryFn: async () => {
      const fresh = (await fetchFriends()).friends;
      const prev =
        queryClient.getQueryData<FriendSummary[]>(friendsQueryKey) ?? cached ?? [];
      const merged = mergeFriendLists(prev, fresh);
      setCachedFriends(merged);
      return merged;
    },
    staleTime: FRIENDS_STALE_MS,
    gcTime: FRIENDS_GC_MS,
    enabled,
    refetchOnWindowFocus: false,
    initialData: cached,
    initialDataUpdatedAt: cached ? 0 : undefined,
  });
}

export function useFriendRequests(enabled = true) {
  const cached = getCachedFriendRequests();

  return useQuery({
    queryKey: friendRequestsQueryKey,
    queryFn: async () => {
      const fresh = await fetchFriendRequests();
      setCachedFriendRequests(fresh);
      return fresh;
    },
    staleTime: FRIENDS_STALE_MS,
    gcTime: FRIENDS_GC_MS,
    enabled,
    refetchOnWindowFocus: false,
    initialData: cached,
    initialDataUpdatedAt: cached ? 0 : undefined,
  });
}

export function useFriendProfile(userId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: friendProfileQueryKey(userId ?? ''),
    queryFn: () => fetchFriendProfile(userId!),
    staleTime: FRIENDS_STALE_MS,
    gcTime: FRIENDS_GC_MS,
    enabled: Boolean(userId) && enabled,
    refetchOnWindowFocus: false,
  });
}

function persistFriends(
  queryClient: ReturnType<typeof useQueryClient>,
  friends: FriendSummary[],
) {
  queryClient.setQueryData(friendsQueryKey, friends);
  setCachedFriends(friends);
}

function persistRequests(
  queryClient: ReturnType<typeof useQueryClient>,
  requests: FriendRequestsResponse,
) {
  queryClient.setQueryData(friendRequestsQueryKey, requests);
  setCachedFriendRequests(requests);
}

export function useRequestFriendMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (query: string) => requestFriend(query),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: friendRequestsQueryKey });
    },
  });
}

export function useAcceptFriendRequestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => acceptFriendRequest(requestId),
    onSuccess: (_data, requestId) => {
      const requests = queryClient.getQueryData<FriendRequestsResponse>(
        friendRequestsQueryKey,
      );
      const accepted = requests?.incoming.find((row) => row.requestId === requestId);
      persistRequests(queryClient, {
        incoming: requests?.incoming.filter((row) => row.requestId !== requestId) ?? [],
        outgoing: requests?.outgoing ?? [],
      });
      if (accepted) {
        const current = queryClient.getQueryData<FriendSummary[]>(friendsQueryKey) ?? [];
        if (!current.some((friend) => friend.userId === accepted.userId)) {
          persistFriends(queryClient, [
            ...current,
            {
              userId: accepted.userId,
              displayName: accepted.displayName,
              username: accepted.username,
              streak: 0,
              calorieStreak: 0,
              goalKg: null,
              weightKg: null,
            },
          ]);
        }
      }
      void queryClient.invalidateQueries({ queryKey: friendsQueryKey });
    },
  });
}

export function useDeclineFriendRequestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => declineFriendRequest(requestId),
    onSuccess: (_data, requestId) => {
      const requests = queryClient.getQueryData<FriendRequestsResponse>(
        friendRequestsQueryKey,
      );
      persistRequests(queryClient, {
        incoming: requests?.incoming.filter((row) => row.requestId !== requestId) ?? [],
        outgoing: requests?.outgoing ?? [],
      });
    },
  });
}

export function friendsErrorMessage(code: string | undefined): string | null {
  switch (code) {
    case 'USER_NOT_FOUND':
      return 'Пользователь не найден';
    case 'SELF_REQUEST':
      return 'Нельзя добавить себя';
    case 'ALREADY_FRIENDS':
      return 'Уже в друзьях';
    case 'REQUEST_PENDING':
      return 'Заявка уже отправлена';
    case 'FRIENDS_ONLY':
      return 'Доступ только для друзей';
    default:
      return null;
  }
}
