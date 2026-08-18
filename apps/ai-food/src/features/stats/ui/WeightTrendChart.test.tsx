import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WeightTrendChart } from './WeightTrendChart';

const viewStart = new Date(2026, 7, 19);
const viewEnd = new Date(2026, 8, 17);

describe('WeightTrendChart', () => {
  it('keeps the chart and swipe when the window has no points', () => {
    const onPanDays = vi.fn();
    render(
      <WeightTrendChart
        points={[]}
        goalKg={80}
        viewStart={viewStart}
        viewEnd={viewEnd}
        onPanDays={onPanDays}
      />,
    );

    expect(screen.getByLabelText('Динамика веса')).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /График веса, окно/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('Нет записей за этот период')).toBeInTheDocument();
    expect(screen.getByText(/свайп/)).toBeInTheDocument();
  });

  it('does not block swipe on the empty-state overlay', () => {
    render(
      <WeightTrendChart
        points={[]}
        goalKg={80}
        viewStart={viewStart}
        viewEnd={viewEnd}
        onPanDays={vi.fn()}
      />,
    );

    expect(screen.getByText('Нет записей за этот период')).toHaveClass(
      'pointer-events-none',
    );
  });
});
