import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { UserProfile } from '@ai-food/shared-types';
import { useSettingsStore } from '@/features/settings';
import { useWeightStore } from '@/features/stats';
import { queueWeightSync } from '@/features/weight-sync';
import { useProfileStore } from './useProfileStore';
import { calculateTargets } from './calculateTargets';
import { createDefaultProfile, todayLocalYmd } from './defaultProfile';
import { syncNutritionProfileToServer } from './syncNutritionProfileToServer';
import { micronutrientTargetsApi } from '../api/micronutrientTargetsApi';

export function useOnboarding() {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<Partial<UserProfile>>({});
  const setProfile = useProfileStore((s) => s.setProfile);
  const setMicronutrientTargets = useProfileStore((s) => s.setMicronutrientTargets);
  const navigate = useNavigate();

  function next(data: Partial<UserProfile>) {
    setDraft((prev) => ({ ...prev, ...data }));
    setStep((s) => s + 1);
  }

  function back() {
    setStep((s) => Math.max(1, s - 1));
  }

  async function completeWithProfile(profile: UserProfile) {
    const withPlanStart: UserProfile = {
      ...profile,
      planStartDate: profile.planStartDate ?? todayLocalYmd(),
      planStartWeight: profile.planStartWeight ?? profile.weight,
    };
    const { targets } = calculateTargets(withPlanStart);
    setProfile(withPlanStart, targets);
    useWeightStore.getState().seedFromOnboarding(
      withPlanStart.planStartWeight!,
      withPlanStart.planStartDate!,
      withPlanStart.targetWeight,
    );
    queueWeightSync({ mode: 'full' });
    syncNutritionProfileToServer();
    const micronutrientTargets = await micronutrientTargetsApi(withPlanStart, {
      model: useSettingsStore.getState().aiModel,
    });
    setMicronutrientTargets(micronutrientTargets);
    navigate('/');
  }

  async function finish() {
    const required: (keyof UserProfile)[] = [
      'gender',
      'age',
      'height',
      'weight',
      'activity',
      'goal',
      'targetWeight',
      'targetWeightDate',
      'dietType',
    ];
    if (required.some((k) => draft[k] === undefined)) return;
    await completeWithProfile(draft as UserProfile);
  }

  async function skip() {
    await completeWithProfile(createDefaultProfile());
  }

  return { step, draft, next, back, finish, skip };
}
