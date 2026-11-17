import type {
  ActivityLevel,
  DietType,
  Goal,
  UserProfile,
} from '@ai-food/shared-types';
import { isFutureDay } from '@/shared/lib';

export interface ProfileDraft {
  gender: UserProfile['gender'];
  age: string;
  height: string;
  weight: string;
  targetWeight: string;
  targetWeightDate: string;
  activity: ActivityLevel;
  goal: Goal;
  dietType: DietType;
}

const AGE_MIN = 1;
const AGE_MAX = 120;
const HEIGHT_MIN = 50;
const HEIGHT_MAX = 300;
const WEIGHT_MIN = 1;
const WEIGHT_MAX = 500;

function parseNumber(raw: string): number | null {
  const trimmed = raw.trim().replace(',', '.');
  if (trimmed === '') return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  return n;
}

function clampRound(n: number, min: number, max: number, decimals: number): number {
  const factor = 10 ** decimals;
  const rounded = Math.round(n * factor) / factor;
  return Math.min(max, Math.max(min, rounded));
}

function parseDateInputValue(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d, 12, 0, 0, 0);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

export function draftFromProfile(profile: UserProfile): ProfileDraft {
  return {
    gender: profile.gender,
    age: String(profile.age),
    height: String(profile.height),
    weight: String(profile.weight),
    targetWeight: String(profile.targetWeight),
    targetWeightDate: profile.targetWeightDate,
    activity: profile.activity,
    goal: profile.goal,
    dietType: profile.dietType ?? 'none',
  };
}

export function isDeadlineAcceptable(
  value: string,
  initialDate: string,
): boolean {
  const parsed = parseDateInputValue(value);
  if (!parsed) return false;
  if (value === initialDate) return true;
  return isFutureDay(parsed);
}

export function parseProfileDraft(
  draft: ProfileDraft,
  base: UserProfile,
  initialDate: string,
): UserProfile | null {
  const age = parseNumber(draft.age);
  const height = parseNumber(draft.height);
  const weight = parseNumber(draft.weight);
  const targetWeight = parseNumber(draft.targetWeight);
  if (
    age == null ||
    height == null ||
    weight == null ||
    targetWeight == null ||
    !isDeadlineAcceptable(draft.targetWeightDate, initialDate)
  ) {
    return null;
  }
  if (age < AGE_MIN || age > AGE_MAX) return null;
  if (height < HEIGHT_MIN || height > HEIGHT_MAX) return null;
  if (weight < WEIGHT_MIN || weight > WEIGHT_MAX) return null;
  if (targetWeight < WEIGHT_MIN || targetWeight > WEIGHT_MAX) return null;

  return {
    ...base,
    gender: draft.gender,
    age: clampRound(age, AGE_MIN, AGE_MAX, 0),
    height: clampRound(height, HEIGHT_MIN, HEIGHT_MAX, 0),
    weight: clampRound(weight, WEIGHT_MIN, WEIGHT_MAX, 1),
    targetWeight: clampRound(targetWeight, WEIGHT_MIN, WEIGHT_MAX, 1),
    targetWeightDate: draft.targetWeightDate,
    activity: draft.activity,
    goal: draft.goal,
    dietType: draft.dietType,
  };
}
