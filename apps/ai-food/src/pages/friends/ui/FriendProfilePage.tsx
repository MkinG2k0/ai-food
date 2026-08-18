import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Flame, Target } from 'lucide-react';
import { useAuthStore } from '@/features/auth';
import {
  FriendProfileMeals,
  friendsErrorMessage,
  useFriendProfile,
} from '@/features/friends';
import { RING_COLORS, SubpageShell } from '@/shared/ui';
import { FriendWeightChart } from './FriendWeightChart';

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
      headerClassName="sticky top-0 z-10 bg-zinc-50/90 backdrop-blur-md"
      mainClassName="space-y-5 pb-10"
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      ) : profile ? (
        <>
          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
            <div className="grid grid-cols-3 gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground">
                  Серия
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold tabular-nums tracking-tight">
                  <Flame
                    className="h-4 w-4 shrink-0 text-emerald-500"
                    aria-hidden
                  />
                  <span className="text-muted-foreground font-medium">Запись</span>
                  {profile.streak}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold tabular-nums tracking-tight">
                  <Target
                    className="h-4 w-4 shrink-0 text-emerald-500"
                    aria-hidden
                  />
                  <span className="text-muted-foreground font-medium">Норма</span>
                  {profile.calorieStreak ?? 0}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground">
                  Вес
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight">
                  {profile.weightKg != null ? (
                    <>
                      {profile.weightKg}
                      <span className="ml-1 text-xs font-medium text-muted-foreground">
                        кг
                      </span>
                    </>
                  ) : (
                    '—'
                  )}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground">
                  Цель
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight">
                  {profile.goalKg != null ? (
                    <>
                      {profile.goalKg}
                      <span className="ml-1 text-xs font-medium text-muted-foreground">
                        кг
                      </span>
                    </>
                  ) : (
                    '—'
                  )}
                </p>
              </div>
            </div>

            {profile.targets ? (
              <div className="mt-4 border-t border-border/60 pt-3">
                <p className="text-[11px] font-medium text-muted-foreground">
                  Дневные цели
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span
                    className="rounded-full px-2.5 py-1 text-xs font-medium tabular-nums"
                    style={{
                      backgroundColor: `${RING_COLORS.kcal}18`,
                      color: RING_COLORS.kcal,
                    }}
                  >
                    {profile.targets.kcal} ккал
                  </span>
                  <span
                    className="rounded-full px-2.5 py-1 text-xs font-medium tabular-nums"
                    style={{
                      backgroundColor: `${RING_COLORS.protein}22`,
                      color: '#E11D48',
                    }}
                  >
                    Б {profile.targets.protein}
                  </span>
                  <span
                    className="rounded-full px-2.5 py-1 text-xs font-medium tabular-nums"
                    style={{
                      backgroundColor: `${RING_COLORS.fat}22`,
                      color: '#D97706',
                    }}
                  >
                    Ж {profile.targets.fat}
                  </span>
                  <span
                    className="rounded-full px-2.5 py-1 text-xs font-medium tabular-nums"
                    style={{
                      backgroundColor: `${RING_COLORS.carbs}22`,
                      color: '#0284C7',
                    }}
                  >
                    У {profile.targets.carbs}
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          <FriendWeightChart
            weights={profile.weights}
            goalKg={profile.goalKg}
          />

          <section className="space-y-3">
            <h2 className="text-sm font-medium">Приёмы за 7 дней</h2>
            <FriendProfileMeals
              meals={profile.meals}
              targets={profile.targets}
            />
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
