import type { AuthLoginResult } from '@/features/auth';
import { applyRemoteNutritionProfile } from './applyRemoteNutritionProfile';
import { syncNutritionProfileToServer } from './syncNutritionProfileToServer';
import { useProfileStore } from './useProfileStore';

export type NutritionProfileLoginSource = 'remote' | 'local-uploaded' | 'none';

/**
 * After Telegram/demo login:
 * - server profile wins when present;
 * - otherwise upload local profile if complete (guest onboarding → login).
 */
export function reconcileNutritionProfileAfterLogin(
  result: Pick<AuthLoginResult, 'nutritionProfile'>,
): NutritionProfileLoginSource {
  if (result.nutritionProfile) {
    applyRemoteNutritionProfile(result.nutritionProfile);
    return 'remote';
  }

  const { profile, targets } = useProfileStore.getState();
  if (profile && targets) {
    syncNutritionProfileToServer();
    return 'local-uploaded';
  }

  return 'none';
}
