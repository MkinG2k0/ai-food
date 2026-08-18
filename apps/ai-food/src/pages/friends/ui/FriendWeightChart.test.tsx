import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FriendWeightChart } from './FriendWeightChart';

function ymdDaysAgo(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

describe('FriendWeightChart', () => {
  it('renders nothing when there are no recent weights', () => {
    const { container } = render(
      <FriendWeightChart weights={[]} goalKg={80} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the weight trend for recent logs', () => {
    render(
      <FriendWeightChart
        weights={[
          { date: ymdDaysAgo(10), kg: 72 },
          { date: ymdDaysAgo(1), kg: 71.4 },
        ]}
        goalKg={80.5}
      />,
    );
    expect(screen.getByLabelText('Динамика веса')).toBeInTheDocument();
    expect(screen.getByText('Динамика веса')).toBeInTheDocument();
  });
});
