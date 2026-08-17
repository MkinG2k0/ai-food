import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  acceptFriendRequest,
  declineFriendRequest,
  fetchFriendProfile,
  fetchFriendRequests,
  fetchFriends,
  requestFriend,
} from '../api/friendsApi';

export const friendsQueryKey = ['friends'] as const;
export const friendRequestsQueryKey = ['friendRequests'] as const;

export function friendProfileQueryKey(userId: string) {
  return ['friendProfile', userId] as const;
}

export function useFriendsList(enabled = true) {
  return useQuery({
    queryKey: friendsQueryKey,
    queryFn: async () => (await fetchFriends()).friends,
    staleTime: 30_000,
    enabled,
    refetchOnWindowFocus: true,
  });
}

export function useFriendRequests(enabled = true) {
  return useQuery({
    queryKey: friendRequestsQueryKey,
    queryFn: fetchFriendRequests,
    staleTime: 30_000,
    enabled,
    refetchOnWindowFocus: true,
  });
}

export function useFriendProfile(userId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: friendProfileQueryKey(userId ?? ''),
    queryFn: () => fetchFriendProfile(userId!),
    staleTime: 30_000,
    enabled: Boolean(userId) && enabled,
  });
}

function invalidateFriendsQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: friendsQueryKey });
  void queryClient.invalidateQueries({ queryKey: friendRequestsQueryKey });
}

export function useRequestFriendMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (query: string) => requestFriend(query),
    onSuccess: () => invalidateFriendsQueries(queryClient),
  });
}

export function useAcceptFriendRequestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => acceptFriendRequest(requestId),
    onSuccess: () => invalidateFriendsQueries(queryClient),
  });
}

export function useDeclineFriendRequestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => declineFriendRequest(requestId),
    onSuccess: () => invalidateFriendsQueries(queryClient),
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
