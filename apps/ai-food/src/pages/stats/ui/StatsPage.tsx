import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDiaryStore } from '@/entities/meal';
import {
  syncNutritionProfileToServer,
  useProfileStore,
} from '@/features/onboarding';
import {
  WeeklyCaloriesChart,
  WeeklyMicronutrientsChart,
  WeightProgressCard,
} from '@/features/stats';
import { useSettingsStore } from '@/features/settings';
import { SubpageShell } from '@/shared/ui';

const FALLBACK_GOAL_KCAL = 2000;

export function StatsPage() {
  const navigate = useNavigate();
  const meals = useDiaryStore((s) => s.meals);
  const profile = useProfileStore((s) => s.profile);
  const targets = useProfileStore((s) => s.targets);
  const micronutrientTargets = useProfileStore((s) => s.micronutrientTargets);
  const updateTargetWeight = useProfileStore((s) => s.updateTargetWeight);
  const featureVitamins = useSettingsStore((s) => s.featureVitamins);
  const [weekOffset, setWeekOffset] = useState(0);
  const goalKcal = targets?.kcal ?? FALLBACK_GOAL_KCAL;

  return (
    <SubpageShell
      title="Статистика"
      onBack={() => navigate('/')}
      headerClassName="sticky top-0 z-10 bg-zinc-50/90 backdrop-blur-md"
      mainClassName="space-y-3 pb-10"
    >
      {profile && (
        <WeightProgressCard
          profileWeight={profile.weight}
          profileGoal={profile.goal}
          profileTargetWeight={profile.targetWeight}
          profileTargetWeightDate={profile.targetWeightDate}
          profilePlanStartDate={profile.planStartDate}
          profilePlanStartWeight={profile.planStartWeight}
          onTargetWeightChange={(kg) => {
            updateTargetWeight(kg);
            syncNutritionProfileToServer();
          }}
        />
      )}

      <WeeklyCaloriesChart
        meals={meals}
        weekOffset={weekOffset}
        onWeekChange={(delta) => setWeekOffset((o) => o + delta)}
        goalKcal={goalKcal}
      />
      {featureVitamins && (
        <>
          <WeeklyMicronutrientsChart
            meals={meals}
            weekOffset={weekOffset}
            onWeekChange={(delta) => setWeekOffset((o) => o + delta)}
            micronutrientTargets={micronutrientTargets}
          />
        </>
      )}
    </SubpageShell>
  );
}
