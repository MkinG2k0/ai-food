import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Meal } from '@ai-food/shared-types';
import { getWeekDays, isSameDay } from '@/shared/lib';
import { WeekStrip, lockPanAxis, isVerticalCalendarGesture } from './WeekStrip';

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

  it('expands month grid on handle click and keeps it open after selecting a day', async () => {
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
    expect(screen.getByTestId('month-calendar-grid')).toHaveAttribute(
      'data-expanded',
      'true',
    );
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

  it('swipes between months with chevrons and keeps a horizontal viewport', async () => {
    renderWeekStrip();
    fireEvent.click(screen.getByTestId('calendar-expand-handle'));
    await waitFor(() => {
      expect(screen.getByTestId('month-calendar-grid')).toHaveAttribute(
        'data-expanded',
        'true',
      );
    });

    const viewport = screen.getByTestId('month-strip-viewport');
    expect(viewport.className).toContain('overflow-x-hidden');
    expect(viewport).toHaveAttribute(
      'aria-label',
      'Календарь, свайп для смены месяца',
    );

    const label = screen.getByTestId('month-calendar-label');
    const initialLabel = label.textContent;
    fireEvent.click(screen.getByLabelText('Следующий месяц'));
    await waitFor(() => {
      expect(label.textContent).not.toBe(initialLabel);
    });

    const afterNext = label.textContent;
    fireEvent.click(screen.getByLabelText('Предыдущий месяц'));
    await waitFor(() => {
      expect(label.textContent).toBe(initialLabel);
    });
    expect(afterNext).not.toBe(initialLabel);
  });
});

describe('calendar pan axis', () => {
  it('locks to the first dominant axis and keeps it', () => {
    expect(lockPanAxis(null, 4, 3)).toBeNull();
    expect(lockPanAxis(null, 80, -20)).toBe('x');
    expect(lockPanAxis(null, 20, -80)).toBe('y');
    expect(lockPanAxis('x', 20, -80)).toBe('x');
  });

  it('does not treat a mostly-horizontal swipe as a vertical close', () => {
    expect(isVerticalCalendarGesture(100, -35)).toBe(false);
    expect(isVerticalCalendarGesture(50, -55)).toBe(false);
    expect(isVerticalCalendarGesture(80, -45)).toBe(false);
    expect(isVerticalCalendarGesture(10, -60)).toBe(true);
  });
});
