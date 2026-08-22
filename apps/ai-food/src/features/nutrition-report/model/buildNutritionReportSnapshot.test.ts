import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Meal } from '@ai-food/shared-types';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  },
}));

const isNativePlatform = vi.fn(() => false);

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => isNativePlatform(),
  },
  registerPlugin: () => ({
    refresh: vi.fn(),
  }),
}));

import { useDiaryStore } from '@/entities/meal';
import { useProfileStore } from '@/features/onboarding';
import { useWeightStore } from '@/features/stats';
import { rollingDaysEndingToday } from './reportPeriods';
import {
  buildNutritionReportSnapshot,
  canSharePdf,
} from './buildNutritionReportSnapshot';

const meal: Meal = {
  id: 'm1',
  timestamp: new Date(2026, 7, 17, 12, 0).toISOString(),
  items: [
    {
      id: 'i1',
      name: 'Обед',
      calories: 500,
      protein: 20,
      fat: 15,
      carbs: 60,
      grams: 200,
      fiber: 5,
    },
  ],
  totalCalories: 500,
  status: 'ready',
};

describe('buildNutritionReportSnapshot', () => {
  beforeEach(() => {
    useDiaryStore.setState({ meals: [meal], selectedDate: new Date(2026, 7, 18) });
    useProfileStore.setState({
      profile: {
        gender: 'female',
        age: 28,
        height: 165,
        weight: 60,
        targetWeight: 58,
        targetWeightDate: '2026-12-31',
        activity: 'medium',
        goal: 'lose',
        dietType: 'none',
      },
      targets: { kcal: 1800, protein: 100, fat: 60, carbs: 180, fiber: 25 },
      micronutrientTargets: null,
      suppressRemoteRestore: false,
    });
    useWeightStore.setState({
      entries: [
        {
          id: 'w1',
          date: '2026-08-17',
          kg: 60,
          clientUpdatedAt: '2026-08-17T08:00:00.000Z',
        },
      ],
      goalKg: 58,
    });
  });

  it('builds report data from current stores', () => {
    const period = rollingDaysEndingToday(new Date(2026, 7, 18), 7);
    const snapshot = buildNutritionReportSnapshot(period);

    expect(snapshot.periodRange).toContain('2026');
    expect(snapshot.summary.avgKcal).toBeGreaterThan(0);
    expect(snapshot.weight.goalKg).toBe(58);
  });
});

describe('canSharePdf', () => {
  beforeEach(() => {
    isNativePlatform.mockReturnValue(false);
  });

  it('returns true on native platform', () => {
    isNativePlatform.mockReturnValue(true);
    expect(canSharePdf()).toBe(true);
  });

  it('returns false when navigator.share is unavailable', () => {
    const originalShare = navigator.share;
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: undefined,
    });
    expect(canSharePdf()).toBe(false);
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: originalShare,
    });
  });

  it('returns true when navigator.canShare accepts pdf files', () => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: vi.fn(() => true),
    });
    expect(canSharePdf()).toBe(true);
  });

  it('returns false when canShare throws', () => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: vi.fn(() => {
        throw new Error('unsupported');
      }),
    });
    expect(canSharePdf()).toBe(false);
  });
});
