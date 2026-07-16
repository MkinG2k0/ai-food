import type {
  MicronutrientEstimate,
  MicronutrientId,
  MicronutrientLevel,
} from '@ai-food/shared-types';
import { describe, expect, it } from 'vitest';
import { MicronutrientsBadges } from './MicronutrientsBadges';
import { render, screen } from '@testing-library/react';

const sample: MicronutrientEstimate[] = [
  { id: 'vitaminC' as MicronutrientId, level: 'high' as MicronutrientLevel },
  { id: 'iron' as MicronutrientId, level: 'medium' as MicronutrientLevel },
  { id: 'vitaminD' as MicronutrientId, level: 'none' as MicronutrientLevel },
];

describe('MicronutrientsBadges', () => {
  it('renders visible levels and hides none', () => {
    render(<MicronutrientsBadges micronutrients={sample} />);
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('много')).toBeInTheDocument();
    expect(screen.getByText('Железо')).toBeInTheDocument();
    expect(screen.getByText('средне')).toBeInTheDocument();
    expect(screen.queryByText('D')).not.toBeInTheDocument();
    expect(screen.getByText('оценка')).toBeInTheDocument();
  });

  it('returns null when empty or only none', () => {
    const { container } = render(
      <MicronutrientsBadges
        micronutrients={[{ id: 'calcium', level: 'none' }]}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});
