export {
  acceptFriendRequest,
  declineFriendRequest,
  fetchFriendProfile,
  fetchFriendRequests,
  fetchFriends,
  removeFriend,
  requestFriend,
  type FriendProfile,
  type FriendProfileMeal,
  type FriendRequestItem,
  type FriendRequestsResponse,
  type FriendSummary,
} from './api/friendsApi';
export { clearFriendsCache } from './model/friendsCache';
export {
  useRemoveFriend,
  useRemoveFriendMutation,
} from './model/useRemoveFriend';
export {
  friendProfileQueryKey,
  friendRequestsQueryKey,
  friendsErrorMessage,
  friendsQueryKey,
  useAcceptFriendRequestMutation,
  useDeclineFriendRequestMutation,
  useFriendProfile,
  useFriendRequests,
  useFriendsList,
  useRequestFriendMutation,
} from './model/useFriendsQueries';
export { FriendListRow } from './ui/FriendListRow';
export { FriendProfileMeals } from './ui/FriendProfileMeals';
export { FriendProfileStatsCard } from './ui/FriendProfileStatsCard';
export type { FriendProfileStatsCardProps } from './ui/FriendProfileStatsCard.types';
export { FriendRequestRow } from './ui/FriendRequestRow';
export { FriendsBellButton } from './ui/FriendsBellButton';
export { RemoveFriendButton } from './ui/RemoveFriendButton';
