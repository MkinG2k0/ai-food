import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Meal } from '@ai-food/shared-types';
import { ANALYZING_STALE_MS } from '../model/mealAnalyzeUi';
import { MealCard } from './MealCard';

vi.mock('../model/useMealImage', () => ({
  useMealImage: () => undefined,
}));

const retryAnalyzeMeal = vi.fn();

vi.mock('@/features/save-meal', () => ({
  useRetryAnalyzeMeal: () => retryAnalyzeMeal,
}));

vi.mock('@/features/auth', () => ({
  useAuthStore: {
    getState: () => ({ userToken: null }),
  },
}));

const analyzingMeal = (overrides: Partial<Meal> = {}): Meal => ({
  id: 'm1',
  timestamp: '2026-08-15T15:00:00.000Z',
  items: [],
  totalCalories: 0,
  status: 'analyzing',
  ...overrides,
});

function renderMealCard(meal: Meal) {
  return render(
    <MemoryRouter>
      <MealCard meal={meal} />
    </MemoryRouter>,
  );
}

describe('MealCard analyzing stale timer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    retryAnalyzeMeal.mockReset();
    retryAnalyzeMeal.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows retry after ANALYZING_STALE_MS even when analyzeJobId is set', () => {
    renderMealCard(
      analyzingMeal({ analyzeJobId: 'job-1' }),
    );

    expect(screen.getByLabelText('Анализ еды')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Повторить' })).toBeNull();

    act(() => {
      vi.advanceTimersByTime(ANALYZING_STALE_MS);
    });

    expect(
      screen.getByRole('button', { name: 'Повторить' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Анализ не завершился/)).toBeInTheDocument();
  });

  it('does not show retry while analyzing before the stale threshold', () => {
    renderMealCard(analyzingMeal());

    act(() => {
      vi.advanceTimersByTime(ANALYZING_STALE_MS - 1);
    });

    expect(screen.queryByRole('button', { name: 'Повторить' })).toBeNull();
    expect(screen.getByLabelText('Анализ еды')).toBeInTheDocument();
  });

  it('restarts the stale timer when retrying the same analyzing meal', () => {
    renderMealCard(analyzingMeal({ name: 'Салат' }));

    act(() => {
      vi.advanceTimersByTime(ANALYZING_STALE_MS);
    });
    const retry = screen.getByRole('button', { name: 'Повторить' });

    fireEvent.click(retry);

    expect(retryAnalyzeMeal).toHaveBeenCalledWith('m1');
    expect(screen.queryByRole('button', { name: 'Повторить' })).toBeNull();
    expect(screen.getByLabelText('Анализ еды')).toHaveAttribute(
      'aria-busy',
      'true',
    );

    act(() => {
      vi.advanceTimersByTime(ANALYZING_STALE_MS - 1);
    });
    expect(screen.queryByRole('button', { name: 'Повторить' })).toBeNull();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(
      screen.getByRole('button', { name: 'Повторить' }),
    ).toBeInTheDocument();
  });

  it('clears stale state when analyzing finishes', () => {
    const { rerender } = renderMealCard(analyzingMeal({ analyzeJobId: 'job-1' }));

    act(() => {
      vi.advanceTimersByTime(ANALYZING_STALE_MS);
    });
    expect(
      screen.getByRole('button', { name: 'Повторить' }),
    ).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <MealCard meal={analyzingMeal({ status: 'ready', name: 'Овсянка' })} />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('button', { name: 'Повторить' })).toBeNull();
    expect(screen.getByText('Овсянка')).toBeInTheDocument();
  });
});
