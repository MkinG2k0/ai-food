import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Flame } from 'lucide-react';
import { useAuthStore } from '@/features/auth';
import {
  FriendProfileMeals,
  friendsErrorMessage,
  useFriendProfile,
} from '@/features/friends';
import { SubpageShell } from '@/shared/ui';

export function FriendProfilePage() {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const userToken = useAuthStore((s) => s.userToken);
  const loggedIn = Boolean(userToken);

  const { data: profile, error, isLoading } = useFriendProfile(
    userId,
    loggedIn,
  );

  useEffect(() => {
    if (!userToken) {
      navigate('/login', { replace: true });
    }
  }, [userToken, navigate]);

  useEffect(() => {
    if (!error) return;
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: string }).code)
        : undefined;
    const message = friendsErrorMessage(code);
    if (message) toast.error(message);
  }, [error]);

  if (!loggedIn) {
    return null;
  }

  return (
    <SubpageShell
      title={profile?.displayName ?? 'Профиль друга'}
      onBack={() => navigate('/friends')}
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      ) : profile ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-input bg-background px-3 py-2">
              <p className="text-xs text-muted-foreground">Серия</p>
              <p className="flex items-center gap-1 text-lg font-semibold tabular-nums">
                <Flame className="h-4 w-4 text-primary" aria-hidden />
                {profile.streak}
              </p>
            </div>
            <div className="rounded-lg border border-input bg-background px-3 py-2">
              <p className="text-xs text-muted-foreground">Вес</p>
              <p className="text-lg font-semibold tabular-nums">
                {profile.weightKg != null ? `${profile.weightKg} кг` : '—'}
              </p>
            </div>
            {profile.goalKg != null ? (
              <div className="rounded-lg border border-input bg-background px-3 py-2">
                <p className="text-xs text-muted-foreground">Цель</p>
                <p className="text-lg font-semibold tabular-nums">
                  {profile.goalKg} кг
                </p>
              </div>
            ) : null}
            {profile.targets ? (
              <div className="rounded-lg border border-input bg-background px-3 py-2 col-span-2">
                <p className="text-xs text-muted-foreground">Дневные цели</p>
                <p className="text-sm tabular-nums">
                  {profile.targets.kcal} ккал · Б {profile.targets.protein} · Ж{' '}
                  {profile.targets.fat} · У {profile.targets.carbs}
                </p>
              </div>
            ) : null}
          </div>

          <section className="space-y-2">
            <h2 className="text-sm font-medium">Приёмы за 7 дней</h2>
            <FriendProfileMeals
              meals={profile.meals}
              sharePhotosToFriends={profile.sharePhotosToFriends}
            />
          </section>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Не удалось загрузить профиль друга.
        </p>
      )}
    </SubpageShell>
  );
}
