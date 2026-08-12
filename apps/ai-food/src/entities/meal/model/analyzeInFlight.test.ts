import { describe, it, expect, beforeEach } from 'vitest';
import {
  abortMealAnalyze,
  beginMealAnalyze,
  endMealAnalyze,
  getMealAnalyzeSignal,
  isMealAnalyzeInFlight,
  resetMealAnalyzeInFlight,
} from './analyzeInFlight';

describe('analyzeInFlight', () => {
  beforeEach(() => {
    resetMealAnalyzeInFlight();
  });

  it('beginMealAnalyze returns a live AbortSignal', () => {
    const signal = beginMealAnalyze('meal-1');
    expect(isMealAnalyzeInFlight('meal-1')).toBe(true);
    expect(signal.aborted).toBe(false);
    expect(getMealAnalyzeSignal('meal-1')).toBe(signal);
  });

  it('abortMealAnalyze aborts the in-flight signal', () => {
    const signal = beginMealAnalyze('meal-1');
    abortMealAnalyze('meal-1');
    expect(signal.aborted).toBe(true);
    expect(isMealAnalyzeInFlight('meal-1')).toBe(true);
  });

  it('endMealAnalyze clears controller and in-flight flag', () => {
    const signal = beginMealAnalyze('meal-1');
    endMealAnalyze('meal-1');
    expect(isMealAnalyzeInFlight('meal-1')).toBe(false);
    expect(getMealAnalyzeSignal('meal-1')).toBeUndefined();
    expect(signal.aborted).toBe(false);
  });

  it('beginMealAnalyze aborts a previous controller for the same meal', () => {
    const first = beginMealAnalyze('meal-1');
    const second = beginMealAnalyze('meal-1');
    expect(first.aborted).toBe(true);
    expect(second.aborted).toBe(false);
    expect(getMealAnalyzeSignal('meal-1')).toBe(second);
  });

  it('abortMealAnalyze is a no-op when meal is not analyzing', () => {
    expect(() => abortMealAnalyze('missing')).not.toThrow();
  });
});
