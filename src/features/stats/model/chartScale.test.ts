import { describe, it, expect } from 'vitest';
import {
  averageLoggedCalories,
  chartTicks,
  formatDateRangeLabel,
  niceChartMax,
} from './chartScale';

describe('niceChartMax', () => {
  it('rounds above data peak with room for goal', () => {
    expect(niceChartMax(4408, 2000)).toBeGreaterThanOrEqual(4408);
    expect(niceChartMax(4408)).toBe(5000);
  });

  it('uses at least 100 when empty', () => {
    expect(niceChartMax(0)).toBe(125);
  });
});

describe('chartTicks', () => {
  it('returns five ticks from 0 to max', () => {
    expect(chartTicks(2000)).toEqual([0, 500, 1000, 1500, 2000]);
  });
});

describe('averageLoggedCalories', () => {
  it('returns null when no logged days', () => {
    expect(averageLoggedCalories([{ calories: 0 }, { calories: 0 }])).toBeNull();
  });

  it('averages only days with calories', () => {
    expect(
      averageLoggedCalories([
        { calories: 0 },
        { calories: 200 },
        { calories: 400 },
      ]),
    ).toBe(300);
  });
});

describe('formatDateRangeLabel', () => {
  it('joins short day-month labels', () => {
    const start = new Date(2026, 6, 10);
    const end = new Date(2026, 6, 16);
    const label = formatDateRangeLabel(start, end);
    expect(label).toContain('·');
    expect(label).toMatch(/10/);
    expect(label).toMatch(/16/);
  });
});
