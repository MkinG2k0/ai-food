import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FriendListRow } from './FriendListRow';
import type { FriendSummary } from '../api/friendsApi';

const friend: FriendSummary = {
  userId: 'u1',
  displayName: 'Демо',
  username: 'demo_user',
  streak: 4,
  calorieStreak: 0,
  weightKg: 75.2,
  goalKg: 70,
};

describe('FriendListRow', () => {
  it('shows current weight pointing to goal', () => {
    render(<FriendListRow friend={friend} onOpen={vi.fn()} />);

    expect(screen.getByLabelText('Вес 75.2 → 70 кг')).toHaveTextContent('75.2');
    expect(screen.getByLabelText('Вес 75.2 → 70 кг')).toHaveTextContent('70');
    expect(screen.queryByLabelText('Норма 0')).not.toBeInTheDocument();
  });

  it('shows dashes when weight and goal are missing', () => {
    render(
      <FriendListRow
        friend={{ ...friend, weightKg: null, goalKg: null }}
        onOpen={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Вес — → — кг')).toHaveTextContent('—');
  });
});
