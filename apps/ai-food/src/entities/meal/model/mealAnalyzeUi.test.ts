import { describe, expect, it } from 'vitest';
import type { Meal } from '@ai-food/shared-types';
import {
  holdPendingAnalyzeStatus,
  mealShouldResumeAnalyze,
  mealShowsAnalyzeLoader,
  mealShowsAnalyzeRetry,
  resolveAnalyzeUiPhase,
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
    expect(resolveAnalyzeUiPhase(meal({ status: 'analyzing' }))).toBe('pending');
  });

  it('shows loader while a soft-interrupt job id is present', () => {
    const row = meal({
      status: 'error',
      analyzeErrorCode: 'STREAM_INTERRUPTED',
      analyzeJobId: 'job-1',
    });
    expect(mealShowsAnalyzeLoader(row)).toBe(true);
    expect(mealShowsAnalyzeRetry(row)).toBe(false);
    expect(mealShouldResumeAnalyze(row)).toBe(true);
    expect(resolveAnalyzeUiPhase(row)).toBe('pending');
  });

  it('shows retry immediately for UPSTREAM_ERROR without leftover loader', () => {
    const row = meal({
      status: 'error',
      analyzeErrorCode: 'UPSTREAM_ERROR',
      analyzeJobId: 'job-1',
    });
    expect(mealShowsAnalyzeLoader(row)).toBe(false);
    expect(mealShowsAnalyzeRetry(row)).toBe(true);
    expect(mealShouldResumeAnalyze(row)).toBe(false);
    expect(resolveAnalyzeUiPhase(row)).toBe('failed');
  });

  it('shows retry immediately for ANALYSIS_FAILED without leftover loader', () => {
    const row = meal({
      status: 'error',
      analyzeErrorCode: 'ANALYSIS_FAILED',
    });
    expect(mealShowsAnalyzeLoader(row)).toBe(false);
    expect(mealShowsAnalyzeRetry(row)).toBe(true);
    expect(mealShouldResumeAnalyze(row)).toBe(false);
    expect(resolveAnalyzeUiPhase(row)).toBe('failed');
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

  it('shows retry for client analysis timeout without resume', () => {
    const row = meal({
      status: 'error',
      analyzeErrorCode: 'ANALYSIS_TIMEOUT',
    });
    expect(mealShowsAnalyzeLoader(row)).toBe(false);
    expect(mealShowsAnalyzeRetry(row)).toBe(true);
    expect(mealShouldResumeAnalyze(row)).toBe(false);
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
    expect(resolveAnalyzeUiPhase(meal({ status: 'ready' }))).toBe('ready');
  });

  it('resumes recovered crash errors that have no error code', () => {
    const row = meal({ status: 'error' });
    expect(mealShouldResumeAnalyze(row)).toBe(true);
    expect(mealShowsAnalyzeLoader(row)).toBe(true);
    expect(mealShowsAnalyzeRetry(row)).toBe(false);
  });

  it('holdPendingAnalyzeStatus keeps terminal failures as error', () => {
    const next = holdPendingAnalyzeStatus(
      meal({ status: 'error', analyzeErrorCode: 'UPSTREAM_ERROR' }),
    );
    expect(next.status).toBe('error');
    expect(next.analyzeErrorCode).toBe('UPSTREAM_ERROR');
  });

  it('holdPendingAnalyzeStatus flips soft interrupt to analyzing', () => {
    const next = holdPendingAnalyzeStatus(
      meal({
        status: 'error',
        analyzeErrorCode: 'STREAM_INTERRUPTED',
        analyzeJobId: 'job-1',
      }),
    );
    expect(next.status).toBe('analyzing');
    expect(next.analyzeErrorCode).toBeUndefined();
  });
});
