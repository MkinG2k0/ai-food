import { describe, it, expect } from 'vitest';
import {
  getWeekStart,
  getWeekDays,
  getMonthGridDays,
  isSameDay,
  isFutureDay,
  formatDayLabel,
  formatHeaderDate,
  timestampForSelectedDate,
  weekOffsetForDate,
} from './dateUtils';

describe('getWeekStart', () => {
  it('returns Monday for a Wednesday', () => {
    // 2026-06-24 is a Wednesday
    const wed = new Date('2026-06-24T12:00:00');
    const result = getWeekStart(wed);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(22);
    expect(result.getHours()).toBe(0);
  });

  it('returns same Monday for a Monday', () => {
    const mon = new Date('2026-06-22T08:00:00');
    const result = getWeekStart(mon);
    expect(result.getDate()).toBe(22);
    expect(result.getDay()).toBe(1);
  });

  it('returns previous Monday for a Sunday', () => {
    // 2026-06-28 is a Sunday
    const sun = new Date('2026-06-28T15:00:00');
    const result = getWeekStart(sun);
    expect(result.getDate()).toBe(22);
    expect(result.getDay()).toBe(1);
  });
});

describe('getWeekDays', () => {
  it('returns exactly 7 days', () => {
    expect(getWeekDays(0)).toHaveLength(7);
  });

  it('first day is Monday (getDay() === 1)', () => {
    expect(getWeekDays(0)[0].getDay()).toBe(1);
  });

  it('last day is Sunday (getDay() === 0)', () => {
    expect(getWeekDays(0)[6].getDay()).toBe(0);
  });

  it('days are consecutive', () => {
    const days = getWeekDays(0);
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    for (let i = 1; i < 7; i++) {
      expect(days[i].getTime() - days[i - 1].getTime()).toBe(MS_PER_DAY);
    }
  });

  it('offset +1 starts 7 days after offset 0', () => {
    const thisMonday = getWeekDays(0)[0];
    const nextMonday = getWeekDays(1)[0];
    const diff = nextMonday.getTime() - thisMonday.getTime();
    expect(diff).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('offset -1 starts 7 days before offset 0', () => {
    const thisMonday = getWeekDays(0)[0];
    const prevMonday = getWeekDays(-1)[0];
    const diff = thisMonday.getTime() - prevMonday.getTime();
    expect(diff).toBe(7 * 24 * 60 * 60 * 1000);
  });
});

describe('isSameDay', () => {
  it('returns true for same calendar day, different times', () => {
    const a = new Date('2026-06-24T08:00:00');
    const b = new Date('2026-06-24T22:30:00');
    expect(isSameDay(a, b)).toBe(true);
  });

  it('returns false for different days', () => {
    const a = new Date('2026-06-24T23:59:59');
    const b = new Date('2026-06-25T00:00:00');
    expect(isSameDay(a, b)).toBe(false);
  });
});

describe('isFutureDay', () => {
  it('returns false for today', () => {
    expect(isFutureDay(new Date())).toBe(false);
  });

  it('returns false for yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isFutureDay(yesterday)).toBe(false);
  });

  it('returns true for tomorrow', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(isFutureDay(tomorrow)).toBe(true);
  });
});

describe('formatDayLabel', () => {
  it('Monday → "Пн"', () => {
    expect(formatDayLabel(new Date('2026-06-22'))).toBe('Пн');
  });

  it('Tuesday → "Вт"', () => {
    expect(formatDayLabel(new Date('2026-06-23'))).toBe('Вт');
  });

  it('Wednesday → "Ср"', () => {
    expect(formatDayLabel(new Date('2026-06-24'))).toBe('Ср');
  });

  it('Thursday → "Чт"', () => {
    expect(formatDayLabel(new Date('2026-06-25'))).toBe('Чт');
  });

  it('Friday → "Пт"', () => {
    expect(formatDayLabel(new Date('2026-06-26'))).toBe('Пт');
  });

  it('Saturday → "Сб"', () => {
    expect(formatDayLabel(new Date('2026-06-27'))).toBe('Сб');
  });

  it('Sunday → "Вс"', () => {
    expect(formatDayLabel(new Date('2026-06-28'))).toBe('Вс');
  });
});

describe('formatHeaderDate', () => {
  it('returns "Сегодня" for today', () => {
    expect(formatHeaderDate(new Date())).toBe('Сегодня');
  });

  it('returns a non-empty string for a past date', () => {
    const result = formatHeaderDate(new Date('2026-06-22'));
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toBe('Сегодня');
  });
});

describe('getMonthGridDays', () => {
  it('starts on Monday and ends on Sunday', () => {
    // August 2026: Sat 1 … Mon 31
    const days = getMonthGridDays(2026, 7);
    expect(days[0].date.getDay()).toBe(1);
    expect(days[days.length - 1].date.getDay()).toBe(0);
    expect(days.length % 7).toBe(0);
  });

  it('marks in-month days correctly for August 2026', () => {
    const days = getMonthGridDays(2026, 7);
    const inMonth = days.filter((d) => d.inMonth);
    expect(inMonth).toHaveLength(31);
    expect(inMonth[0].date.getDate()).toBe(1);
    expect(inMonth[30].date.getDate()).toBe(31);
    expect(days[0].inMonth).toBe(false); // Jul 27 padding
  });
});

describe('weekOffsetForDate', () => {
  it('returns 0 for a day in the current week', () => {
    const today = new Date(2026, 7, 12); // Wed
    const mon = new Date(2026, 7, 10);
    expect(weekOffsetForDate(mon, today)).toBe(0);
  });

  it('returns 1 for next week', () => {
    const today = new Date(2026, 7, 12);
    const nextMon = new Date(2026, 7, 17);
    expect(weekOffsetForDate(nextMon, today)).toBe(1);
  });
});

describe('timestampForSelectedDate', () => {
  it('uses selected calendar day with time from now for a past date', () => {
    const selected = new Date(2026, 5, 10, 0, 0, 0, 0); // June 10 local
    const now = new Date(2026, 6, 16, 14, 30, 45, 123); // July 16 14:30:45.123
    const result = timestampForSelectedDate(selected, now);
    const parsed = new Date(result);
    expect(isSameDay(parsed, selected)).toBe(true);
    expect(parsed.getHours()).toBe(14);
    expect(parsed.getMinutes()).toBe(30);
    expect(parsed.getSeconds()).toBe(45);
    expect(parsed.getMilliseconds()).toBe(123);
  });

  it('keeps today as today when selectedDate is today', () => {
    const now = new Date(2026, 6, 16, 9, 15, 0, 0);
    const selected = new Date(2026, 6, 16, 0, 0, 0, 0);
    const result = timestampForSelectedDate(selected, now);
    expect(isSameDay(new Date(result), selected)).toBe(true);
    expect(isSameDay(new Date(result), now)).toBe(true);
  });
});
