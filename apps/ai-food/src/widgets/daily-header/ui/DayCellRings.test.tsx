import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DayCellRings, RING_COLORS } from './DayCellRings';

const fullProgress = { kcal: 0.5, protein: 0.4, fat: 0.3, carbs: 0.2 };

const onlyKcal = {
  kcal: true,
  protein: false,
  fat: false,
  carbs: false,
};

const kcalProtein = {
  kcal: true,
  protein: true,
  fat: false,
  carbs: false,
};

const fullRings = {
  kcal: true,
  protein: true,
  fat: true,
  carbs: true,
};

describe('DayCellRings', () => {
  it('renders SVG digit without ring arcs when hasReadyMeals is false', () => {
    render(
      <DayCellRings
        dayNumber={12}
        rings={kcalProtein}
        progress={fullProgress}
        hasReadyMeals={false}
      />,
    );
    const svg = screen.getByTestId('day-cell-rings-svg');
    expect(svg.querySelectorAll('[data-ring]')).toHaveLength(0);
    expect(screen.getByTestId('day-cell-rings')).toHaveAttribute(
      'data-has-rings',
      'false',
    );
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('renders one kcal arc when only kcal enabled', () => {
    render(
      <DayCellRings
        dayNumber={5}
        rings={onlyKcal}
        progress={fullProgress}
        hasReadyMeals
      />,
    );
    const svg = screen.getByTestId('day-cell-rings-svg');
    expect(svg.querySelectorAll('[data-ring]')).toHaveLength(1);
    expect(svg.querySelector('[data-ring="kcal"]')).toHaveAttribute(
      'stroke',
      RING_COLORS.kcal,
    );
  });

  it('renders kcal + protein arcs', () => {
    render(
      <DayCellRings
        dayNumber={5}
        rings={kcalProtein}
        progress={fullProgress}
        hasReadyMeals
      />,
    );
    const svg = screen.getByTestId('day-cell-rings-svg');
    expect(svg.querySelectorAll('[data-ring]')).toHaveLength(2);
    expect(svg.querySelector('[data-ring="protein"]')).toHaveAttribute(
      'stroke',
      RING_COLORS.protein,
    );
  });

  it('renders custom combo fat + carbs only', () => {
    render(
      <DayCellRings
        dayNumber={5}
        rings={{ kcal: false, protein: false, fat: true, carbs: true }}
        progress={fullProgress}
        hasReadyMeals
      />,
    );
    const svg = screen.getByTestId('day-cell-rings-svg');
    expect(svg.querySelectorAll('[data-ring]')).toHaveLength(2);
    expect(svg.querySelector('[data-ring="fat"]')).toHaveAttribute(
      'stroke',
      RING_COLORS.fat,
    );
    expect(svg.querySelector('[data-ring="carbs"]')).toHaveAttribute(
      'stroke',
      RING_COLORS.carbs,
    );
  });

  it('renders four arcs with locked colors when all enabled', () => {
    render(
      <DayCellRings
        dayNumber={5}
        rings={fullRings}
        progress={fullProgress}
        hasReadyMeals
      />,
    );
    const svg = screen.getByTestId('day-cell-rings-svg');
    expect(svg.querySelectorAll('[data-ring]')).toHaveLength(4);
  });

  it('clamps progress above 1 via dash offset not negative infinity', () => {
    render(
      <DayCellRings
        dayNumber={1}
        rings={onlyKcal}
        progress={{ kcal: 2, protein: 0, fat: 0, carbs: 0 }}
        hasReadyMeals
      />,
    );
    const arc = screen
      .getByTestId('day-cell-rings-svg')
      .querySelector('[data-ring="kcal"]');
    const offset = Number(arc?.getAttribute('stroke-dashoffset'));
    expect(offset).toBe(0);
  });
});
