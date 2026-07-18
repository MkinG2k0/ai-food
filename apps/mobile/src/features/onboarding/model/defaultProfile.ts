import type { UserProfile } from '@ai-food/shared-types';

const DEFAULT_DEADLINE_DAYS = 90;

function defaultDeadlineDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + DEFAULT_DEADLINE_DAYS);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Defaults aligned with onboarding step initial values. */
export function createDefaultProfile(): UserProfile {
  return {
    gender: 'male',
    age: 25,
    height: 170,
    weight: 70,
    activity: 'medium',
    goal: 'maintain',
    targetWeight: 70,
    targetWeightDate: defaultDeadlineDate(),
    dietType: 'none',
  };
}
