import { describe, expect, it } from 'vitest';
import { mealDaypart } from './mealDaypart';

function atHour(hour: number, minute = 0): string {
  return new Date(2026, 7, 18, hour, minute, 0).toISOString();
}

describe('mealDaypart', () => {
  it('maps morning hours to breakfast', () => {
    expect(mealDaypart(atHour(5))).toBe('breakfast');
    expect(mealDaypart(atHour(10, 59))).toBe('breakfast');
  });

  it('maps midday hours to lunch', () => {
    expect(mealDaypart(atHour(11))).toBe('lunch');
    expect(mealDaypart(atHour(15, 59))).toBe('lunch');
  });

  it('maps evening hours to dinner', () => {
    expect(mealDaypart(atHour(16))).toBe('dinner');
    expect(mealDaypart(atHour(21, 59))).toBe('dinner');
  });

  it('maps late night and early morning to snack', () => {
    expect(mealDaypart(atHour(22))).toBe('snack');
    expect(mealDaypart(atHour(2, 54))).toBe('snack');
  });
});
