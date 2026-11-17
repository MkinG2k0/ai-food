import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Meal } from '@ai-food/shared-types';
import { MealCard } from './MealCard';

const { useMealImage } = vi.hoisted(() => ({
  useMealImage: vi.fn(() => undefined as string | null | undefined),
}));

vi.mock('../model/useMealImage', () => ({
  useMealImage,
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

const errorMeal = (overrides: Partial<Meal> = {}): Meal => ({
  id: 'm1',
  timestamp: '2026-08-15T14:59:00.000Z',
  items: [],
  totalCalories: 0,
  status: 'error',
  analyzeErrorCode: 'UPSTREAM_ERROR',
  ...overrides,
});

const readyMeal = (overrides: Partial<Meal> = {}): Meal => ({
  id: 'm1',
  timestamp: '2026-08-15T15:00:00.000Z',
  name: 'Мегаролл',
  items: [
    {
      id: 'i1',
      name: 'Мегаролл',
      calories: 542,
      protein: 25,
      carbs: 48,
      fat: 28,
      fiber: 3,
      grams: 200,
    },
  ],
  totalCalories: 542,
  status: 'ready',
  foodType: 'sandwich',
  ...overrides,
});

function renderMealCard(meal: Meal) {
  return render(
    <MemoryRouter>
      <MealCard meal={meal} />
    </MemoryRouter>,
  );
}

describe('MealCard analyze lifecycle UI', () => {
  beforeEach(() => {
    useMealImage.mockReset();
    useMealImage.mockReturnValue(undefined);
    retryAnalyzeMeal.mockReset();
    retryAnalyzeMeal.mockResolvedValue(undefined);
  });

  it('keeps loader while analyzing — no premature Retry', () => {
    renderMealCard(analyzingMeal({ analyzeJobId: 'job-1' }));

    expect(screen.getByLabelText('Анализ еды')).toBeInTheDocument();
    expect(screen.getByLabelText('Анализ еды')).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(screen.queryByRole('button', { name: 'Повторить' })).toBeNull();
  });

  it('shows Retry immediately for terminal UPSTREAM_ERROR without spinner', () => {
    const { container } = renderMealCard(errorMeal());

    expect(
      screen.getByRole('button', { name: 'Повторить' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Анализ не завершился/)).toBeInTheDocument();
    expect(container.querySelector('.meal-card-border-loader')).toBeNull();
    expect(container.querySelector('.animate-spin')).toBeNull();
  });

  it('places time in the top-right of the failed card, not inline after error text', () => {
    const expectedTime = new Date('2026-08-15T14:59:00.000Z').toLocaleTimeString(
      [],
      { hour: '2-digit', minute: '2-digit' },
    );
    renderMealCard(errorMeal());

    const errorText = screen.getByText('Анализ не завершился…');
    const time = screen.getByText(expectedTime);
    const row = errorText.parentElement;
    expect(row).not.toBeNull();
    expect(row).toContainElement(time);
    expect(row!.className).toMatch(/justify-between/);
    // Error label and time are siblings — time is not glued into the error <p>.
    expect(errorText.textContent).toBe('Анализ не завершился…');
  });

  it('retries from the failed card', () => {
    renderMealCard(errorMeal());
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(retryAnalyzeMeal).toHaveBeenCalledWith('m1');
  });

  it('clears error UI when analyzing finishes', () => {
    const { rerender } = renderMealCard(errorMeal());
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <MealCard meal={analyzingMeal({ status: 'ready', name: 'Овсянка' })} />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('button', { name: 'Повторить' })).toBeNull();
    expect(screen.getByText('Овсянка')).toBeInTheDocument();
  });
});

describe('MealCard photo fallback', () => {
  beforeEach(() => {
    useMealImage.mockReset();
    useMealImage.mockReturnValue(undefined);
  });

  it('shows food-type icon when there is no photo', () => {
    renderMealCard(readyMeal({ foodType: 'soup', name: 'Суп куриный' }));

    expect(screen.getByRole('img', { name: 'Суп' })).toBeInTheDocument();
  });

  it('keeps utensils placeholder while a photo path is still loading', () => {
    useMealImage.mockReturnValue(null);

    const { container } = renderMealCard(
      readyMeal({
        imageUri: 'meal-images/loading.jpg',
        foodType: 'sandwich',
      }),
    );

    expect(screen.queryByRole('img', { name: 'Сэндвич' })).not.toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('falls back to food-type icon when photo fails to load', () => {
    useMealImage.mockReturnValue('capacitor://localhost/missing.jpg');

    const { container } = renderMealCard(
      readyMeal({
        imageUri: 'meal-images/missing.jpg',
        foodType: 'sandwich',
      }),
    );

    const photo = container.querySelector('img');
    expect(photo).toHaveAttribute('src', 'capacitor://localhost/missing.jpg');

    fireEvent.error(photo!);

    expect(screen.getByRole('img', { name: 'Сэндвич' })).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });
});
