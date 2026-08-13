import { describe, expect, it } from 'vitest';
import {
  getMonthWeekBuckets,
  monthElapsedDays,
  monthStartFor,
} from './monthPeriod';

/** Thursday 13 Aug 2026 */
const TODAY = new Date(2026, 7, 13, 12, 0, 0, 0);

describe('monthStartFor', () => {
  it('returns the 1st of the current month for offset 0', () => {
    const start = monthStartFor(TODAY, 0);
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(7);
    expect(start.getDate()).toBe(1);
  });

  it('shifts to the previous calendar month', () => {
    const start = monthStartFor(TODAY, -1);
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(6);
    expect(start.getDate()).toBe(1);
  });
});

describe('getMonthWeekBuckets', () => {
  it('clips the current week to today and keeps future weeks', () => {
    const buckets = getMonthWeekBuckets(monthStartFor(TODAY, 0), TODAY);
    expect(buckets.map((b) => [b.start.getDate(), b.end.getDate()])).toEqual([
      [1, 7],
      [8, 13],
      [15, 21],
      [22, 28],
      [29, 31],
    ]);
  });

  it('returns full chunks for a past month', () => {
    const july = monthStartFor(TODAY, -1);
    const buckets = getMonthWeekBuckets(july, TODAY);
    expect(buckets.map((b) => [b.start.getDate(), b.end.getDate()])).toEqual([
      [1, 7],
      [8, 14],
      [15, 21],
      [22, 28],
      [29, 31],
    ]);
  });

  it('stops at 28 days in a non-leap February', () => {
    const feb = new Date(2026, 1, 1);
    const buckets = getMonthWeekBuckets(feb, TODAY);
    expect(buckets.map((b) => [b.start.getDate(), b.end.getDate()])).toEqual([
      [1, 7],
      [8, 14],
      [15, 21],
      [22, 28],
    ]);
  });
});

describe('monthElapsedDays', () => {
  it('runs 1…today in the current month', () => {
    const days = monthElapsedDays(monthStartFor(TODAY, 0), TODAY);
    expect(days).toHaveLength(13);
    expect(days[0].getDate()).toBe(1);
    expect(days.at(-1)?.getDate()).toBe(13);
  });

  it('returns [] for a future month', () => {
    expect(monthElapsedDays(monthStartFor(TODAY, 1), TODAY)).toEqual([]);
  });
});
