import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@/features/auth';
import {
  FriendProfileMeals,
  FriendProfileStatsCard,
  RemoveFriendButton,
  useFriendProfile,
} from '@/features/friends';
import { useFriendProfilePage } from '../model/useFriendProfilePage';
import { FriendWeightChart } from './FriendWeightChart';
import { SubpageShell } from '@/shared/ui';

export function FriendProfilePage() {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const userToken = useAuthStore((s) => s.userToken);
  const loggedIn = Boolean(userToken);

  const { data: profile, error, isLoading } = useFriendProfile(userId, loggedIn);

  useFriendProfilePage({ error, loggedIn });

  if (!loggedIn) {
    return null;
  }

  return (
    <SubpageShell
      title={profile?.displayName ?? 'Профиль друга'}
      onBack={() => navigate('/friends')}
      headerClassName="sticky top-0 z-10 bg-background/90 backdrop-blur-sm"
      mainClassName="space-y-5 pb-10"
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      ) : profile ? (
        <>
          <FriendProfileStatsCard profile={profile} />
          <RemoveFriendButton userId={profile.userId} className="w-full" />
          <FriendWeightChart weights={profile.weights} goalKg={profile.goalKg} />
          <section className="space-y-3">
            <h2 className="text-sm font-medium">Приёмы за 7 дней</h2>
            <FriendProfileMeals meals={profile.meals} targets={profile.targets} />
          </section>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Не удалось загрузить профиль друга.
        </p>
      )}
    </SubpageShell>
  );
}