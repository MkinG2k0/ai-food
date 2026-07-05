import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Meal } from '@ai-food/shared-types';
import { getWeekDays, isSameDay } from '@/shared/lib';
import { WeekStrip } from './WeekStrip';

const currentWeekDays = getWeekDays(0);

const fixtureMeal: Meal = {
  id: 'meal-1',
  timestamp: currentWeekDays[2].toISOString(),
  items: [],
  totalCalories: 500,
};

function renderWeekStrip(onDaySelect = vi.fn(), onWeekChange = vi.fn()) {
  render(
    <WeekStrip
      weekOffset={0}
      selectedDate={currentWeekDays[0]}
      meals={[fixtureMeal]}
      onDaySelect={onDaySelect}
      onWeekChange={onWeekChange}
    />,
  );
  return { onDaySelect, onWeekChange };
}

describe('WeekStrip', () => {
  it('renders 21 day buttons total (3 weeks x 7 days)', () => {
    renderWeekStrip();
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(21);
  });

  it('renders the viewport wrapper with overflow-hidden', () => {
    renderWeekStrip();
    const viewport = screen.getByTestId('week-strip-viewport');
    expect(viewport.className).toContain('overflow-hidden');
  });

  it('calls onDaySelect with the matching date when a day in the current week is clicked', () => {
    const { onDaySelect } = renderWeekStrip();
    const buttons = screen.getAllByRole('button');
    // DOM order is prev(0-6), current(7-13), next(14-20); current week day index 3 is at overall index 10.
    fireEvent.click(buttons[10]);

    expect(onDaySelect).toHaveBeenCalledTimes(1);
    const calledWithDate = onDaySelect.mock.calls[0][0] as Date;
    expect(isSameDay(calledWithDate, currentWeekDays[3])).toBe(true);
  });

  it('renders a meal-dot indicator for a day with a matching meal', () => {
    renderWeekStrip();
    const buttons = screen.getAllByRole('button');
    // current week day index 2 is at overall index 9 (7 + 2).
    const dayButton = buttons[9];
    const dot = dayButton.querySelector('span:last-child');

    expect(dot).not.toBeNull();
    expect(dot?.className).toMatch(/bg-emerald/);
    expect(dot?.className).not.toMatch(/bg-transparent/);
  });
});
