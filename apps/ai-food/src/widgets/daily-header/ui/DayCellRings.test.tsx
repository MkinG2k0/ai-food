import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DayCellRings, RING_COLORS } from './DayCellRings';

const fullProgress = { kcal: 0.5, protein: 0.4, fat: 0.3, carbs: 0.2 };

describe('DayCellRings', () => {
  it('renders no SVG when hasReadyMeals is false', () => {
    render(
      <DayCellRings
        dayNumber={12}
        mode="kcal_protein"
        progress={fullProgress}
        hasReadyMeals={false}
      />,
    );
    expect(screen.queryByTestId('day-cell-rings-svg')).toBeNull();
    expect(screen.getByTestId('day-cell-rings')).toHaveAttribute(
      'data-has-rings',
      'false',
    );
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('renders one kcal arc for mode kcal', () => {
    render(
      <DayCellRings
        dayNumber={5}
        mode="kcal"
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

  it('renders kcal + protein arcs for mode kcal_protein', () => {
    render(
      <DayCellRings
        dayNumber={5}
        mode="kcal_protein"
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

  it('renders four arcs with locked colors for mode full', () => {
    render(
      <DayCellRings
        dayNumber={5}
        mode="full"
        progress={fullProgress}
        hasReadyMeals
      />,
    );
    const svg = screen.getByTestId('day-cell-rings-svg');
    expect(svg.querySelectorAll('[data-ring]')).toHaveLength(4);
    expect(svg.querySelector('[data-ring="fat"]')).toHaveAttribute(
      'stroke',
      RING_COLORS.fat,
    );
    expect(svg.querySelector('[data-ring="carbs"]')).toHaveAttribute(
      'stroke',
      RING_COLORS.carbs,
    );
  });

  it('clamps progress above 1 via dash offset not negative infinity', () => {
    render(
      <DayCellRings
        dayNumber={1}
        mode="kcal"
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
