import type { Meal } from '@ai-food/shared-types';
import { getWeekStart } from '@/shared/lib';

export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100] as const;

export const STREAK_WEEK_LABELS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'] as const;

export const CALORIE_STREAK_TOLERANCE = 0.2;

const FREEZE_GRANT_MILESTONES = [7, 14, 30, 60, 100] as const;
const MAX_FREEZE_COUNT = 2;

export interface CalorieStreakPersist {
  currentLength: number;
  freezeCount: number;
  consumedFreezeDateKeys: string[];
  grantedMilestones: number[];
  bestStreak: number;
}

export const EMPTY_CALORIE_STREAK_PERSIST: CalorieStreakPersist = {
  currentLength: 0,
  freezeCount: 0,
  consumedFreezeDateKeys: [],
  grantedMilestones: [],
  bestStreak: 0,
};

export interface CalorieStreakInput {
  goal: 'lose' | 'maintain' | 'gain';
  kcalTarget: number;
}

export interface StreakPersist {
  /** Active consecutive-day streak; synced for friends/social. */
  currentLength: number;
  freezeCount: number;
  consumedFreezeDateKeys: string[];
  grantedMilestones: number[];
  lastCelebratedLocalDate: string;
  bestStreak: number;
  calorieStreak: CalorieStreakPersist;
}

export interface StreakWeekDay {
  date: Date;
  filled: boolean;
  label: string;
}

export interface StreakTrackSnapshot {
  currentLength: number;
  todayCounted: boolean;
  startDate: Date | null;
  weekDays: StreakWeekDay[];
  nextMilestone: number | null;
  remainingDays: number;
  progress01: number;
  achieved100: boolean;
  freezeCount: number;
  bestStreak: number;
  personalBestLabel: string;
}

export interface StreakSnapshot extends StreakTrackSnapshot {
  shouldCelebrate: boolean;
  calorie: StreakTrackSnapshot;
}

export interface StreakApplyResult {
  snapshot: StreakSnapshot;
  persistPatch: Partial<StreakPersist>;
}

export const EMPTY_STREAK_PERSIST: StreakPersist = {
  currentLength: 0,
  freezeCount: 0,
  consumedFreezeDateKeys: [],
  grantedMilestones: [],
  lastCelebratedLocalDate: '',
  bestStreak: 0,
  calorieStreak: EMPTY_CALORIE_STREAK_PERSIST,
};

export function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function dateFromLocalKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function prevLocalKey(key: string): string {
  const date = dateFromLocalKey(key);
  return localDateKey(
    new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1),
  );
}

function isCountedMeal(meal: Meal): boolean {
  return (meal.status ?? 'ready') === 'ready';
}

function getCountedDateKeys(meals: Meal[]): Set<string> {
  const keys = new Set<string>();
  for (const meal of meals) {
    if (isCountedMeal(meal)) {
      keys.add(localDateKey(new Date(meal.timestamp)));
    }
  }
  return keys;
}

export function isCalorieGoalHit(
  consumedKcal: number,
  kcalTarget: number,
  goal: CalorieStreakInput['goal'],
): boolean {
  const p = CALORIE_STREAK_TOLERANCE;
  const lower = kcalTarget * (1 - p);
  const upper = kcalTarget * (1 + p);
  if (goal === 'gain') return consumedKcal >= lower;
  if (goal === 'maintain') return consumedKcal >= lower && consumedKcal <= upper;
  return consumedKcal <= upper;
}

function isValidCalorieInput(
  calorie?: CalorieStreakInput | null,
): calorie is CalorieStreakInput {
  return (
    calorie != null &&
    Number.isFinite(calorie.kcalTarget) &&
    calorie.kcalTarget > 0 &&
    (calorie.goal === 'lose' ||
      calorie.goal === 'maintain' ||
      calorie.goal === 'gain')
  );
}

function getCalorieHitDateKeys(
  meals: Meal[],
  calorie: CalorieStreakInput,
): Set<string> {
  const sums = new Map<string, number>();
  for (const meal of meals) {
    if (!isCountedMeal(meal)) continue;
    const key = localDateKey(new Date(meal.timestamp));
    sums.set(key, (sums.get(key) ?? 0) + meal.totalCalories);
  }

  const hits = new Set<string>();
  for (const [key, kcal] of sums) {
    if (kcal > 0 && isCalorieGoalHit(kcal, calorie.kcalTarget, calorie.goal)) {
      hits.add(key);
    }
  }
  return hits;
}

function isCovered(
  key: string,
  counted: Set<string>,
  consumed: Set<string>,
): boolean {
  return counted.has(key) || consumed.has(key);
}

function computeCurrentRun(
  counted: Set<string>,
  consumed: Set<string>,
  freezeCount: number,
  now: Date,
): {
  length: number;
  startKey: string | null;
  consumeKey: string | null;
  newFreezeCount: number;
} {
  const todayKey = localDateKey(now);
  const yesterdayKey = prevLocalKey(todayKey);
  const todayCounted = counted.has(todayKey);
  let cursor = todayCounted ? todayKey : yesterdayKey;
  let consumeKey: string | null = null;
  let remainingFreezes = freezeCount;
  let canConsume = true;
  const runKeys: string[] = [];

  while (true) {
    if (isCovered(cursor, counted, consumed)) {
      runKeys.push(cursor);
      cursor = prevLocalKey(cursor);
      continue;
    }

    if (!todayCounted && cursor === yesterdayKey) {
      break;
    }

    const olderKey = prevLocalKey(cursor);
    if (
      canConsume &&
      remainingFreezes > 0 &&
      !consumed.has(cursor) &&
      isCovered(olderKey, counted, consumed)
    ) {
      consumeKey = cursor;
      remainingFreezes -= 1;
      canConsume = false;
      runKeys.push(cursor);
      cursor = olderKey;
      continue;
    }

    break;
  }

  const startKey = runKeys.length > 0 ? runKeys[runKeys.length - 1]! : null;

  return {
    length: runKeys.length,
    startKey,
    consumeKey,
    newFreezeCount: remainingFreezes,
  };
}

function longestHistoricalRun(
  counted: Set<string>,
  consumed: Set<string>,
): number {
  const coveredKeys = new Set([...counted, ...consumed]);
  if (coveredKeys.size === 0) return 0;

  let best = 0;
  for (const endKey of coveredKeys) {
    let length = 0;
    let cursor = endKey;

    while (isCovered(cursor, counted, consumed)) {
      length += 1;
      cursor = prevLocalKey(cursor);
    }

    best = Math.max(best, length);
  }

  return best;
}

function computeNextGoal(currentLength: number): {
  nextMilestone: number | null;
  remainingDays: number;
  progress01: number;
  achieved100: boolean;
} {
  if (currentLength >= 100) {
    return {
      nextMilestone: null,
      remainingDays: 0,
      progress01: 1,
      achieved100: true,
    };
  }

  let previous = 0;
  for (const milestone of STREAK_MILESTONES) {
    if (milestone <= currentLength) previous = milestone;
  }

  const next =
    STREAK_MILESTONES.find((milestone) => milestone > currentLength) ?? null;

  if (next === null) {
    return {
      nextMilestone: null,
      remainingDays: 0,
      progress01: 1,
      achieved100: false,
    };
  }

  return {
    nextMilestone: next,
    remainingDays: next - currentLength,
    progress01: (currentLength - previous) / (next - previous),
    achieved100: false,
  };
}

function buildWeekDays(
  now: Date,
  counted: Set<string>,
  consumed: Set<string>,
): StreakWeekDay[] {
  const monday = getWeekStart(now);
  return STREAK_WEEK_LABELS.map((label, index) => {
    const date = new Date(
      monday.getFullYear(),
      monday.getMonth(),
      monday.getDate() + index,
      12,
      0,
      0,
      0,
    );
    const key = localDateKey(date);
    return {
      date,
      label,
      filled: isCovered(key, counted, consumed),
    };
  });
}

function computeGrant(
  currentLength: number,
  freezeCount: number,
  grantedMilestones: number[],
): { newFreezeCount: number; newGranted: number[] } {
  let newFreezeCount = freezeCount;
  const newGranted = [...grantedMilestones];

  for (const milestone of FREEZE_GRANT_MILESTONES) {
    if (
      currentLength >= milestone &&
      !grantedMilestones.includes(milestone) &&
      newFreezeCount < MAX_FREEZE_COUNT
    ) {
      newFreezeCount += 1;
      newGranted.push(milestone);
      break;
    }
  }

  return { newFreezeCount, newGranted };
}

function sameStringList(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function sameNumberList(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function caloriePersistEquals(
  a: CalorieStreakPersist,
  b: CalorieStreakPersist,
): boolean {
  return (
    a.currentLength === b.currentLength &&
    a.freezeCount === b.freezeCount &&
    a.bestStreak === b.bestStreak &&
    sameStringList(a.consumedFreezeDateKeys, b.consumedFreezeDateKeys) &&
    sameNumberList(a.grantedMilestones, b.grantedMilestones)
  );
}

function applyTrack(
  counted: Set<string>,
  persist: CalorieStreakPersist,
  now: Date,
): { snapshot: StreakTrackSnapshot; next: CalorieStreakPersist } {
  const consumed = new Set(persist.consumedFreezeDateKeys);
  const todayKey = localDateKey(now);
  const todayCounted = counted.has(todayKey);

  const run = computeCurrentRun(
    counted,
    consumed,
    persist.freezeCount,
    now,
  );

  let nextConsumed = [...persist.consumedFreezeDateKeys];
  let nextFreezeCount = run.newFreezeCount;

  if (run.consumeKey) {
    nextConsumed = [...nextConsumed, run.consumeKey];
    consumed.add(run.consumeKey);
  }

  const grant = computeGrant(
    run.length,
    nextFreezeCount,
    persist.grantedMilestones,
  );
  nextFreezeCount = grant.newFreezeCount;

  const historicalBest = longestHistoricalRun(counted, consumed);
  const bestStreak = Math.max(persist.bestStreak, run.length, historicalBest);
  const goal = computeNextGoal(run.length);
  const startDate = run.startKey ? dateFromLocalKey(run.startKey) : null;

  return {
    snapshot: {
      currentLength: run.length,
      todayCounted,
      startDate,
      weekDays: buildWeekDays(now, counted, consumed),
      nextMilestone: goal.nextMilestone,
      remainingDays: goal.remainingDays,
      progress01: goal.progress01,
      achieved100: goal.achieved100,
      freezeCount: nextFreezeCount,
      bestStreak,
      personalBestLabel: 'Личный рекорд',
    },
    next: {
      currentLength: run.length,
      freezeCount: nextFreezeCount,
      consumedFreezeDateKeys: nextConsumed,
      grantedMilestones: grant.newGranted,
      bestStreak,
    },
  };
}

export function streakDaysLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'день';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'дня';
  return 'дней';
}

export function applyStreakState(
  meals: Meal[],
  persist: StreakPersist,
  now: Date,
  calorie?: CalorieStreakInput | null,
): StreakApplyResult {
  const counted = getCountedDateKeys(meals);
  const logging = applyTrack(
    counted,
    {
      currentLength: persist.currentLength,
      freezeCount: persist.freezeCount,
      consumedFreezeDateKeys: persist.consumedFreezeDateKeys,
      grantedMilestones: persist.grantedMilestones,
      bestStreak: persist.bestStreak,
    },
    now,
  );

  const persistPatch: Partial<StreakPersist> = {};
  if (logging.next.currentLength !== persist.currentLength) {
    persistPatch.currentLength = logging.next.currentLength;
  }
  if (logging.next.freezeCount !== persist.freezeCount) {
    persistPatch.freezeCount = logging.next.freezeCount;
  }
  if (
    !sameStringList(
      logging.next.consumedFreezeDateKeys,
      persist.consumedFreezeDateKeys,
    )
  ) {
    persistPatch.consumedFreezeDateKeys = logging.next.consumedFreezeDateKeys;
  }
  if (
    !sameNumberList(logging.next.grantedMilestones, persist.grantedMilestones)
  ) {
    persistPatch.grantedMilestones = logging.next.grantedMilestones;
  }
  if (logging.next.bestStreak !== persist.bestStreak) {
    persistPatch.bestStreak = logging.next.bestStreak;
  }

  const todayKey = localDateKey(now);
  const todayCounted = counted.has(todayKey);
  const shouldCelebrate =
    todayCounted &&
    persist.lastCelebratedLocalDate !== todayKey &&
    logging.next.currentLength >= 1;

  const caloriePersist = persist.calorieStreak ?? EMPTY_CALORIE_STREAK_PERSIST;
  const calorieHits = isValidCalorieInput(calorie)
    ? getCalorieHitDateKeys(meals, calorie)
    : new Set<string>();
  if (isValidCalorieInput(calorie)) {
    calorieHits.delete(todayKey);
  }

  const calorieTrack = applyTrack(calorieHits, caloriePersist, now);
  if (!caloriePersistEquals(calorieTrack.next, caloriePersist)) {
    persistPatch.calorieStreak = calorieTrack.next;
  }

  const snapshot: StreakSnapshot = {
    ...logging.snapshot,
    todayCounted,
    shouldCelebrate,
    calorie: calorieTrack.snapshot,
  };

  return { snapshot, persistPatch };
}
