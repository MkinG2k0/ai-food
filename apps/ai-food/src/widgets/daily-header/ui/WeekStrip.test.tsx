import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
      calendarRings={{
        kcal: true,
        protein: true,
        fat: false,
        carbs: false,
      }}
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

  it('shows ring arcs for a ready-meal day and none for empty days', () => {
    renderWeekStrip();
    const buttons = screen.getAllByRole('button');
    const mealDay = buttons[9];
    const emptyDay = buttons[10];

    expect(mealDay.querySelectorAll('[data-ring]').length).toBeGreaterThan(0);
    expect(emptyDay.querySelectorAll('[data-ring]')).toHaveLength(0);
  });

  it('renders calendar expand handle', () => {
    renderWeekStrip();
    expect(screen.getByTestId('calendar-expand-handle')).toBeInTheDocument();
    expect(screen.getByLabelText('Календарь на месяц')).toBeInTheDocument();
  });

  it('expands month grid on handle click and selects day', async () => {
    const { onDaySelect } = renderWeekStrip();
    fireEvent.click(screen.getByTestId('calendar-expand-handle'));

    expect(await screen.findByTestId('month-calendar-grid')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByTestId('week-strip-viewport')).toBeNull();
    });

    const monthDays = screen.getAllByTestId('month-day-cell');
    expect(monthDays.length).toBeGreaterThanOrEqual(28);
    fireEvent.click(monthDays[10]);

    expect(onDaySelect).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByTestId('month-calendar-grid')).toBeNull();
    });
    expect(await screen.findByTestId('week-strip-viewport')).toBeInTheDocument();
  });

  it('toggles month closed when handle clicked again', async () => {
    renderWeekStrip();
    const handle = screen.getByTestId('calendar-expand-handle');
    fireEvent.click(handle);
    expect(await screen.findByTestId('month-calendar-grid')).toBeInTheDocument();
    fireEvent.click(handle);
    await waitFor(() => {
      expect(screen.queryByTestId('month-calendar-grid')).toBeNull();
    });
  });
});
