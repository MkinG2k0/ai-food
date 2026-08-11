import { describe, expect, it } from 'vitest';
import {
  defaultGoalKg,
  formatWeightDeadlineCopy,
  getWeightTrendPoints,
  goalTitle,
  isGoalReached,
  remainingCopy,
} from './weightProgress';

describe('weightProgress helpers', () => {
  it('builds goal title and default target by profile goal', () => {
    expect(goalTitle('gain')).toBe('Набрать вес');
    expect(defaultGoalKg(63, 'gain')).toBe(68);
    expect(defaultGoalKg(70, 'lose')).toBe(65);
    expect(defaultGoalKg(70, 'maintain')).toBe(70);
  });

  it('detects goal reached including overshoot for lose/gain', () => {
    expect(isGoalReached(65, 70, 'gain')).toBe(false);
    expect(isGoalReached(70, 70, 'gain')).toBe(true);
    expect(isGoalReached(72.3, 70, 'gain')).toBe(true);
    expect(isGoalReached(64, 65, 'lose')).toBe(true);
    expect(isGoalReached(70, 70, 'maintain')).toBe(true);
    expect(isGoalReached(70.4, 70, 'maintain')).toBe(true);
    expect(isGoalReached(72.3, 70, 'maintain')).toBe(false);
    expect(
      isGoalReached(72.3, 70, 'maintain', [{ kg: 68.5 }, { kg: 72.3 }]),
    ).toBe(true);
  });

  it('formats remaining text', () => {
    expect(remainingCopy(63, 71, 'gain')).toBe('8.0 кг осталось');
    expect(remainingCopy(70, 65, 'lose')).toBe('5.0 кг осталось');
    expect(remainingCopy(70, 70, 'maintain')).toBe('Цель достигнута');
    expect(remainingCopy(72, 70, 'gain')).toBe('Цель достигнута');
  });

  it('filters trend points to trailing window', () => {
    const today = new Date(2026, 6, 16);
    const points = getWeightTrendPoints(
      [
        { id: 'a', date: '2026-06-01', kg: 80 },
        { id: 'b', date: '2026-07-10', kg: 70 },
        { id: 'c', date: '2026-07-16', kg: 69.5 },
      ],
      30,
      today,
    );

    expect(points).toHaveLength(2);
    expect(points[0].kg).toBe(70);
    expect(points[1].kg).toBe(69.5);
  });
});

describe('formatWeightDeadlineCopy', () => {
  it('appends deadline when not reached and date present', () => {
    const formatted = new Date('2026-11-15T12:00:00').toLocaleDateString(
      'ru-RU',
      { day: 'numeric', month: 'long', year: 'numeric' },
    );
    expect(
      formatWeightDeadlineCopy('3.5 кг от цели', '2026-11-15', false),
    ).toBe(`3.5 кг от цели · до ${formatted}`);
  });

  it('returns remaining only when reached', () => {
    expect(
      formatWeightDeadlineCopy('Цель достигнута', '2026-11-15', true),
    ).toBe('Цель достигнута');
  });

  it('returns remaining only when date missing', () => {
    expect(formatWeightDeadlineCopy('8.0 кг осталось', null, false)).toBe(
      '8.0 кг осталось',
    );
    expect(formatWeightDeadlineCopy('8.0 кг осталось', '', false)).toBe(
      '8.0 кг осталось',
    );
    expect(
      formatWeightDeadlineCopy('8.0 кг осталось', undefined, false),
    ).toBe('8.0 кг осталось');
  });
});
