import type { NutritionProfilePayload } from '@/features/auth';
import { defaultMicronutrientTargets } from './defaultMicronutrientTargets';
import { useProfileStore } from './useProfileStore';

export function applyRemoteNutritionProfile(
  payload: NutritionProfilePayload,
): void {
  const { setProfile, setMicronutrientTargets } = useProfileStore.getState();
  setProfile(payload.profile, payload.targets);

  if (Array.isArray(payload.micronutrientTargets)) {
    setMicronutrientTargets(payload.micronutrientTargets);
  } else if (payload.micronutrientTargets === null) {
    setMicronutrientTargets(null);
  } else {
    setMicronutrientTargets(
      defaultMicronutrientTargets(payload.profile.gender),
    );
  }
}
