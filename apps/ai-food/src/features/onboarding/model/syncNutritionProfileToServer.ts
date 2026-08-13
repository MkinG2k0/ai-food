import { toast } from 'sonner';
import { putNutritionProfile, useAuthStore } from '@/features/auth';
import { useProfileStore } from './useProfileStore';

export function syncNutritionProfileToServer(): void {
  if (!useAuthStore.getState().userToken) return;

  const { profile, targets, micronutrientTargets } = useProfileStore.getState();
  if (!profile || !targets) return;

  void putNutritionProfile({
    profile,
    targets,
    micronutrientTargets,
  }).catch((error: unknown) => {
    toast.error(
      error instanceof Error
        ? error.message
        : 'Не удалось сохранить профиль на сервер',
    );
  });
}
