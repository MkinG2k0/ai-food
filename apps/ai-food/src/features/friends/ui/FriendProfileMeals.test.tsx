import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { localDateKey } from '@/entities/streak';
import { FriendProfileMeals } from './FriendProfileMeals';
import type { FriendProfileMeal } from '../api/friendsApi';

const targets = {
  kcal: 2000,
  protein: 100,
  fat: 70,
  carbs: 250,
};

function at(hour: number, minute = 0): Date {
  return new Date(2026, 7, 18, hour, minute, 0);
}

function meal(
  overrides: Partial<FriendProfileMeal> &
    Pick<FriendProfileMeal, 'id' | 'timestamp'>,
): FriendProfileMeal {
  return {
    name: 'Овсянка',
    totalCalories: 400,
    protein: 20,
    fat: 10,
    carbs: 50,
    ...overrides,
  };
}

describe('FriendProfileMeals', () => {
  it('shows empty copy when there are no meals', () => {
    render(<FriendProfileMeals meals={[]} targets={targets} />);
    expect(
      screen.getByText('За последние 7 дней приёмов пищи нет.'),
    ).toBeInTheDocument();
  });

  it('renders two КБ rings for the day', () => {
    const timestamp = at(8, 30).toISOString();
    const dateKey = localDateKey(at(8, 30));
    render(
      <FriendProfileMeals
        meals={[
          meal({
            id: 'm1',
            timestamp,
            totalCalories: 2000,
            protein: 100,
            fat: 70,
            carbs: 250,
          }),
        ]}
        targets={targets}
      />,
    );

    const rings = screen.getByTestId(`friend-day-rings-${dateKey}`);
    expect(rings).toHaveAttribute('data-has-rings', 'true');
    expect(rings).toHaveAttribute('data-ring-count', '2');
    expect(rings.querySelectorAll('[data-ring]')).toHaveLength(2);
    expect(rings.querySelector('[data-ring="kcal"]')).toBeTruthy();
    expect(rings.querySelector('[data-ring="protein"]')).toBeTruthy();
    expect(screen.getByText('цель')).toBeInTheDocument();
  });

  it('opens a day goal sheet with КБЖУ on row click', () => {
    render(
      <FriendProfileMeals
        meals={[
          meal({
            id: 'm1',
            timestamp: at(8, 15).toISOString(),
            name: 'Омлет',
            totalCalories: 500,
            protein: 40,
            fat: 20,
            carbs: 30,
          }),
        ]}
        targets={targets}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Подробнее о цели/ }));

    expect(screen.getByRole('heading', { level: 2, name: /вторник/i })).toBeInTheDocument();
    expect(screen.getByText('Калории')).toBeInTheDocument();
    expect(screen.getByText('Белки')).toBeInTheDocument();
    expect(screen.getByText('Жиры')).toBeInTheDocument();
    expect(screen.getByText('Углеводы')).toBeInTheDocument();
    expect(screen.getByText('осталось 1500 ккал')).toBeInTheDocument();
  });

  it('uses a time-of-day tile instead of a photo placeholder', () => {
    render(
      <FriendProfileMeals
        meals={[
          meal({
            id: 'm1',
            timestamp: at(8, 15).toISOString(),
            name: 'Омлет',
          }),
        ]}
        targets={targets}
      />,
    );

    expect(screen.getByLabelText('Завтрак')).toBeInTheDocument();
    expect(screen.getByText('Омлет')).toBeInTheDocument();
    expect(screen.queryByText('цель')).not.toBeInTheDocument();
  });
});
