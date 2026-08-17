import { describe, expect, it } from 'vitest';
import type { Meal } from '@ai-food/shared-types';
import {
  holdPendingAnalyzeStatus,
  mealShouldResumeAnalyze,
  mealShowsAnalyzeLoader,
  mealShowsAnalyzeRetry,
} from './mealAnalyzeUi';

const meal = (overrides: Partial<Meal> = {}): Meal => ({
  id: 'm1',
  timestamp: '2026-08-15T15:00:00.000Z',
  items: [],
  totalCalories: 0,
  ...overrides,
});

describe('mealAnalyzeUi', () => {
  it('shows loader while analyzing', () => {
    expect(mealShowsAnalyzeLoader(meal({ status: 'analyzing' }))).toBe(true);
    expect(mealShowsAnalyzeRetry(meal({ status: 'analyzing' }))).toBe(false);
  });

  it('shows loader while a gateway job id is present even if status is error', () => {
    const row = meal({ status: 'error', analyzeJobId: 'job-1' });
    expect(mealShowsAnalyzeLoader(row)).toBe(true);
    expect(mealShowsAnalyzeRetry(row)).toBe(false);
  });

  it('shows loader for a leftover generic error until the gateway GET settles', () => {
    const row = meal({ status: 'error', analyzeErrorCode: 'ANALYSIS_FAILED' });
    expect(mealShowsAnalyzeLoader(row)).toBe(true);
    expect(mealShowsAnalyzeRetry(row)).toBe(false);
    expect(mealShouldResumeAnalyze(row)).toBe(true);
  });

  it('shows retry for confirmed no-food / quota / job-gone errors', () => {
    const row = meal({
      status: 'error',
      analyzeErrorCode: 'NO_FOOD_DETECTED',
    });
    expect(mealShowsAnalyzeLoader(row)).toBe(false);
    expect(mealShowsAnalyzeRetry(row)).toBe(true);
    expect(mealShouldResumeAnalyze(row)).toBe(false);

    const gone = meal({ status: 'error', analyzeErrorCode: 'JOB_NOT_FOUND' });
    expect(mealShowsAnalyzeRetry(gone)).toBe(true);
  });

  it('shows retry for no-food even if a leftover analyzeJobId is still on the meal', () => {
    const row = meal({
      status: 'error',
      analyzeErrorCode: 'NO_FOOD_DETECTED',
      analyzeJobId: 'job-1',
    });
    expect(mealShowsAnalyzeLoader(row)).toBe(false);
    expect(mealShowsAnalyzeRetry(row)).toBe(true);
    expect(mealShouldResumeAnalyze(row)).toBe(false);
  });

  it('does not show loader for a ready meal', () => {
    expect(mealShowsAnalyzeLoader(meal({ status: 'ready' }))).toBe(false);
    expect(mealShowsAnalyzeRetry(meal({ status: 'ready' }))).toBe(false);
  });

  it('holdPendingAnalyzeStatus flips generic error to analyzing', () => {
    const next = holdPendingAnalyzeStatus(
      meal({ status: 'error', analyzeErrorCode: 'ANALYSIS_FAILED' }),
    );
    expect(next.status).toBe('analyzing');
    expect(next.analyzeErrorCode).toBeUndefined();
  });
});
