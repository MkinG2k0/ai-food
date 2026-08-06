import { toast } from 'sonner';
import { putNutritionProfile, useAuthStore } from '@/features/auth';
import { useProfileStore } from './useProfileStore';

export function syncNutritionProfileToServer(): void {
  if (!useAuthStore.getState().userToken) return;

  const { profile, targets } = useProfileStore.getState();
  if (!profile || !targets) return;

  void putNutritionProfile({ profile, targets }).catch((error: unknown) => {
    toast.error(
      error instanceof Error
        ? error.message
        : 'Не удалось сохранить профиль на сервер',
    );
  });
}
