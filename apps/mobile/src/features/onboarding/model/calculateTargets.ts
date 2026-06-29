import type { UserProfile, DailyTargets, ActivityLevel, Goal } from '@ai-food/shared-types';

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  low: 1.2,
  medium: 1.55,
  high: 1.725,
};

const GOAL_DELTA: Record<Goal, number> = {
  lose: -300,
  maintain: 0,
  gain: 300,
};

export function calculateTargets(profile: UserProfile): DailyTargets {
  const { gender, age, height, weight, activity, goal } = profile;

  const bmr =
    gender === 'male'
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;

  const tdee = bmr * ACTIVITY_MULTIPLIER[activity];
  const kcal = Math.round(tdee) + GOAL_DELTA[goal];
  const protein = Math.round(weight * 1.8);
  const fat = Math.round((kcal * 0.25) / 9);
  const carbs = Math.round((kcal - protein * 4 - fat * 9) / 4);

  return { kcal, protein, fat, carbs };
}
