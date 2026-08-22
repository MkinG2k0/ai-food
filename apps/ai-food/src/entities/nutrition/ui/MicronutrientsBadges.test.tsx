import type { MicronutrientEstimate, MicronutrientId } from '@ai-food/shared-types';
import { describe, expect, it } from 'vitest';
import { MicronutrientsBadges } from './MicronutrientsBadges';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const sample: MicronutrientEstimate[] = [
  { id: 'vitaminC' as MicronutrientId, amount: 45, unit: 'mg' },
  { id: 'iron' as MicronutrientId, amount: 2.5, unit: 'mg' },
  { id: 'vitaminD' as MicronutrientId, amount: 0, unit: 'µg' },
];

const withExtra: MicronutrientEstimate[] = [
  { id: 'vitaminC', amount: 8.5, unit: 'mg' },
  { id: 'vitaminE', amount: 5.8, unit: 'mg' },
  { id: 'zinc', amount: 1.8, unit: 'mg' },
  { id: 'iron', amount: 2.5, unit: 'mg' },
];

describe('MicronutrientsBadges', () => {
  it('renders amount + Russian unit and hides zeros', () => {
    render(<MicronutrientsBadges micronutrients={sample} />);
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText(/45 мг/)).toBeInTheDocument();
    expect(screen.getByText('Fe')).toBeInTheDocument();
    expect(screen.getByText(/2\.5 мг/)).toBeInTheDocument();
    expect(screen.queryByText('D')).not.toBeInTheDocument();
    expect(screen.queryByText('много')).not.toBeInTheDocument();
    expect(screen.queryByText('оценка')).not.toBeInTheDocument();
  });

  it('returns null when empty or only zeros', () => {
    const { container } = render(
      <MicronutrientsBadges
        micronutrients={[{ id: 'calcium', amount: 0, unit: 'mg' }]}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows priority badges by default and expands on click', async () => {
    const user = userEvent.setup();
    render(<MicronutrientsBadges micronutrients={withExtra} />);

    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('Fe')).toBeInTheDocument();
    expect(screen.queryByText('E')).not.toBeInTheDocument();
    expect(screen.queryByText('Zn')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Развернуть' }));

    expect(screen.getByText('E')).toBeInTheDocument();
    expect(screen.getByText('Zn')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Свернуть' })).toBeInTheDocument();
  });
});
