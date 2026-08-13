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
      id: 'oats',
      name: 'oats',
      grams: 100,
      calories: 500,
      protein: 20,
      fat: 10,
      carbs: 60,
      fiber: 0,
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
  it('renders 21 day buttons in the week strip (3 weeks x 7 days)', () => {
    renderWeekStrip();
    const viewport = screen.getByTestId('week-strip-viewport');
    const weekButtons = viewport.querySelectorAll('button');
    expect(weekButtons).toHaveLength(21);
    expect(screen.getByTestId('calendar-expand-handle')).toBeInTheDocument();
  });

  it('renders the viewport wrapper with horizontal overflow clip', () => {
    renderWeekStrip();
    const viewport = screen.getByTestId('week-strip-viewport');
    expect(viewport.className).toContain('overflow-x-hidden');
  });

  it('calls onDaySelect with the matching date when a day in the current week is clicked', () => {
    const { onDaySelect } = renderWeekStrip();
    const viewport = screen.getByTestId('week-strip-viewport');
    const weekButtons = viewport.querySelectorAll('button');
    // DOM: prev(0-6), current(7-13), next(14-20)
    fireEvent.click(weekButtons[10]!);

    expect(onDaySelect).toHaveBeenCalledTimes(1);
    const calledWithDate = onDaySelect.mock.calls[0][0] as Date;
    expect(isSameDay(calledWithDate, currentWeekDays[3])).toBe(true);
  });

  it('shows ring arcs for a ready-meal day and none for empty days', () => {
    renderWeekStrip();
    const viewport = screen.getByTestId('week-strip-viewport');
    const weekButtons = viewport.querySelectorAll('button');
    const mealDay = weekButtons[9]!;
    const emptyDay = weekButtons[10]!;

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

    const month = await screen.findByTestId('month-calendar-grid');
    await waitFor(() => {
      expect(month).toHaveAttribute('data-expanded', 'true');
    });

    const monthDays = screen.getAllByTestId('month-day-cell');
    expect(monthDays.length).toBeGreaterThanOrEqual(28);
    fireEvent.click(monthDays[10]!);

    expect(onDaySelect).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.getByTestId('month-calendar-grid')).toHaveAttribute(
        'data-expanded',
        'false',
      );
    });
    expect(screen.getByTestId('week-strip-viewport')).toBeInTheDocument();
  });

  it('toggles month closed when handle clicked again', async () => {
    renderWeekStrip();
    const handle = screen.getByTestId('calendar-expand-handle');
    fireEvent.click(handle);
    await waitFor(() => {
      expect(screen.getByTestId('month-calendar-grid')).toHaveAttribute(
        'data-expanded',
        'true',
      );
    });
    fireEvent.click(handle);
    await waitFor(() => {
      expect(screen.getByTestId('month-calendar-grid')).toHaveAttribute(
        'data-expanded',
        'false',
      );
    });
  });
});
