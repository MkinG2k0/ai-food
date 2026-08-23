import { describe, it, expect } from 'vitest';
import type { Meal } from '@ai-food/shared-types';
import {
  computeReminderSchedule,
  hasReadyMealNearSlot,
  readyMealCountOnDate,
  streakLengthOnDate,
} from './computeReminderSchedule';
import { DEFAULT_REMINDER_SETTINGS } from './types';

function meal(
  id: string,
  dateKey: string,
  hour: number,
  status: Meal['status'] = 'ready',
): Meal {
  const [y, m, d] = dateKey.split('-').map(Number);
  return {
    id,
    timestamp: new Date(y, m - 1, d, hour, 0, 0).toISOString(),
    status,
    totalCalories: 400,
    items: [],
    name: 'Test',
  } as Meal;
}

const baseInput = {
  windowDays: 7,
  settings: { ...DEFAULT_REMINDER_SETTINGS },
  meals: [] as Meal[],
  streakLength: 0,
  profileTargetWeight: null as number | null,
  weightEntryDates: [] as string[],
  lastForegroundAt: null as string | null,
  notifiedMilestoneKeys: [] as string[],
  analyzeErrorMeals: [] as { id: string }[],
};

describe('hasReadyMealNearSlot', () => {
  it('returns true when ready meal is within ±2h of slot', () => {
    const meals = [meal('1', '2026-08-23', 9)];
    expect(
      hasReadyMealNearSlot(meals, '2026-08-23', { hour: 8, minute: 30 }),
    ).toBe(true);
  });

  it('returns false when meal is outside ±2h window', () => {
    const meals = [meal('1', '2026-08-23', 14)];
    expect(
      hasReadyMealNearSlot(meals, '2026-08-23', { hour: 8, minute: 30 }),
    ).toBe(false);
  });

  it('ignores non-ready meals', () => {
    const meals = [meal('1', '2026-08-23', 9, 'analyzing')];
    expect(
      hasReadyMealNearSlot(meals, '2026-08-23', { hour: 8, minute: 30 }),
    ).toBe(false);
  });
});

describe('streakLengthOnDate', () => {
  it('counts consecutive ready days ending on asOfKey', () => {
    const meals = [
      meal('1', '2026-08-21', 12),
      meal('2', '2026-08-22', 12),
      meal('3', '2026-08-23', 12),
    ];
    expect(streakLengthOnDate(meals, '2026-08-23')).toBe(3);
  });
});

describe('computeReminderSchedule', () => {
  const now = new Date(2026, 7, 23, 7, 0, 0);

  it('schedules breakfast when no nearby meal', () => {
    const scheduled = computeReminderSchedule({
      ...baseInput,
      now,
    });
    const breakfast = scheduled.find((s) => s.kind === 'meal-breakfast');
    expect(breakfast).toBeDefined();
    expect(breakfast!.title.length).toBeGreaterThan(0);
    expect(breakfast!.body.length).toBeGreaterThan(10);
    expect(`${breakfast!.title} ${breakfast!.body}`.toLowerCase()).toMatch(
      /завтрак|утро|кофе/,
    );
    expect(breakfast!.at.getHours()).toBe(8);
    expect(breakfast!.at.getMinutes()).toBe(30);
  });

  it('skips breakfast when ready meal exists near slot', () => {
    const scheduled = computeReminderSchedule({
      ...baseInput,
      now,
      windowDays: 1,
      meals: [meal('1', '2026-08-23', 9)],
    });
    expect(scheduled.some((s) => s.kind === 'meal-breakfast')).toBe(false);
  });

  it('schedules streak at risk when streak active and no meals today', () => {
    const scheduled = computeReminderSchedule({
      ...baseInput,
      now,
      streakLength: 5,
      meals: [meal('1', '2026-08-22', 12)],
    });
    const risk = scheduled.find((s) => s.kind === 'streak-risk');
    expect(risk).toBeDefined();
    expect(risk!.body).toMatch(/5/);
    expect(risk!.body.toLowerCase()).toMatch(/сери/);
  });

  it('skips streak at risk when today has ready meal', () => {
    const scheduled = computeReminderSchedule({
      ...baseInput,
      now,
      streakLength: 5,
      meals: [meal('1', '2026-08-23', 10)],
    });
    expect(scheduled.some((s) => s.kind === 'streak-risk')).toBe(false);
  });

  it('schedules milestone morning when yesterday hit milestone and no evening open', () => {
    const scheduled = computeReminderSchedule({
      ...baseInput,
      now,
      meals: [
        meal('1', '2026-08-20', 12),
        meal('2', '2026-08-21', 12),
        meal('3', '2026-08-22', 12),
      ],
      lastForegroundAt: '2026-08-22T11:00:00.000Z',
    });
    const milestone = scheduled.find((s) => s.kind === 'streak-milestone');
    expect(milestone).toBeDefined();
    expect(milestone!.body).toContain('3');
  });

  it('skips milestone when user opened app yesterday evening', () => {
    const scheduled = computeReminderSchedule({
      ...baseInput,
      now,
      meals: [
        meal('1', '2026-08-20', 12),
        meal('2', '2026-08-21', 12),
        meal('3', '2026-08-22', 12),
      ],
      lastForegroundAt: new Date(2026, 7, 22, 19, 0, 0).toISOString(),
    });
    expect(scheduled.some((s) => s.kind === 'streak-milestone')).toBe(false);
  });

  it('schedules weight reminder on Sunday when entry is stale', () => {
    const sundayMorning = new Date(2026, 7, 23, 7, 0, 0);
    expect(sundayMorning.getDay()).toBe(0);

    const scheduled = computeReminderSchedule({
      ...baseInput,
      now: sundayMorning,
      profileTargetWeight: 70,
      weightEntryDates: ['2026-08-10'],
    });
    const weight = scheduled.find((s) => s.kind === 'weight-weekly');
    expect(weight).toBeDefined();
  });

  it('schedules analyze error with meal route', () => {
    const scheduled = computeReminderSchedule({
      ...baseInput,
      now,
      analyzeErrorMeals: [{ id: 'meal-abc' }],
    });
    const err = scheduled.find((s) => s.kind === 'analyze-error');
    expect(err).toBeDefined();
    expect(err!.route).toBe('/meal/meal-abc');
  });

  it('returns empty when master toggle off', () => {
    const scheduled = computeReminderSchedule({
      ...baseInput,
      now,
      settings: { ...DEFAULT_REMINDER_SETTINGS, enabled: false },
      analyzeErrorMeals: [{ id: 'x' }],
    });
    expect(scheduled).toHaveLength(0);
  });
});

describe('readyMealCountOnDate', () => {
  it('counts only ready meals on date', () => {
    const meals = [
      meal('1', '2026-08-23', 10),
      meal('2', '2026-08-23', 14, 'error'),
    ];
    expect(readyMealCountOnDate(meals, '2026-08-23')).toBe(1);
  });
});
