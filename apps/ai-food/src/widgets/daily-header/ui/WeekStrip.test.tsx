import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Meal } from '@ai-food/shared-types';
import { getWeekDays, isSameDay } from '@/shared/lib';
import { WeekStrip } from './WeekStrip';

const currentWeekDays = getWeekDays(0);

const fixtureMeal: Meal = {
  id: 'meal-1',
  timestamp: currentWeekDays[2].toISOString(),
  status: 'ready',
  items: [
    {
      name: 'oats',
      grams: 100,
      calories: 500,
      protein: 20,
      fat: 10,
      carbs: 60,
    },
  ],
  totalCalories: 500,
};

function renderWeekStrip(onDaySelect = vi.fn(), onWeekChange = vi.fn()) {
  render(
    <WeekStrip
      weekOffset={0}
      selectedDate={currentWeekDays[0]}
      meals={[fixtureMeal]}
      calendarRingMode="kcal_protein"
      onDaySelect={onDaySelect}
      onWeekChange={onWeekChange}
    />,
  );
  return { onDaySelect, onWeekChange };
}

describe('WeekStrip', () => {
  it('renders 21 day buttons total (3 weeks x 7 days)', () => {
    renderWeekStrip();
    // 21 week days + expand handle
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(22);
  });

  it('renders the viewport wrapper with overflow-hidden', () => {
    renderWeekStrip();
    const viewport = screen.getByTestId('week-strip-viewport');
    expect(viewport.className).toContain('overflow-hidden');
  });

  it('calls onDaySelect with the matching date when a day in the current week is clicked', () => {
    const { onDaySelect } = renderWeekStrip();
    const buttons = screen.getAllByRole('button');
    // DOM: prev(0-6), current(7-13), next(14-20), handle(21)
    fireEvent.click(buttons[10]);

    expect(onDaySelect).toHaveBeenCalledTimes(1);
    const calledWithDate = onDaySelect.mock.calls[0][0] as Date;
    expect(isSameDay(calledWithDate, currentWeekDays[3])).toBe(true);
  });

  it('shows rings SVG for a ready-meal day and none for empty days', () => {
    renderWeekStrip();
    const buttons = screen.getAllByRole('button');
    const mealDay = buttons[9];
    const emptyDay = buttons[10];

    expect(mealDay.querySelector('[data-testid="day-cell-rings-svg"]')).not.toBeNull();
    expect(emptyDay.querySelector('[data-testid="day-cell-rings-svg"]')).toBeNull();
  });

  it('renders calendar expand handle', () => {
    renderWeekStrip();
    expect(screen.getByTestId('calendar-expand-handle')).toBeInTheDocument();
    expect(screen.getByLabelText('Календарь на месяц')).toBeInTheDocument();
  });

  it('expands month grid on handle click and selects day', () => {
    const { onDaySelect } = renderWeekStrip();
    fireEvent.click(screen.getByTestId('calendar-expand-handle'));

    expect(screen.getByTestId('month-calendar-grid')).toBeInTheDocument();
    expect(screen.queryByTestId('week-strip-viewport')).toBeNull();

    const monthDays = screen.getAllByTestId('month-day-cell');
    expect(monthDays.length).toBeGreaterThanOrEqual(28);
    fireEvent.click(monthDays[10]);

    expect(onDaySelect).toHaveBeenCalledTimes(1);
    // collapsed after select
    expect(screen.queryByTestId('month-calendar-grid')).toBeNull();
    expect(screen.getByTestId('week-strip-viewport')).toBeInTheDocument();
  });

  it('toggles month closed when handle clicked again', () => {
    renderWeekStrip();
    const handle = screen.getByTestId('calendar-expand-handle');
    fireEvent.click(handle);
    expect(screen.getByTestId('month-calendar-grid')).toBeInTheDocument();
    fireEvent.click(handle);
    expect(screen.queryByTestId('month-calendar-grid')).toBeNull();
  });
});
