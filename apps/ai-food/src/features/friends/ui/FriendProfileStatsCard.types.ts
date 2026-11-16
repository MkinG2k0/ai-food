import type { FriendProfile } from '../api/friendsApi';

export interface FriendProfileStatsCardProps {
  className?: string;
  profile: Pick<
    FriendProfile,
    'calorieStreak' | 'goalKg' | 'streak' | 'targets' | 'weightKg'
  >;
}