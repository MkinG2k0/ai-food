import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const isComplete = vi.fn(() => false);
const mockHydrated = vi.fn(() => false);

vi.mock('@/features/onboarding', () => ({
  useProfileStore: (selector: (s: { isComplete: () => boolean }) => unknown) =>
    selector({ isComplete }),
  useProfileHydrated: () => mockHydrated(),
}));

import { ProfileGuard } from './ProfileGuard';

function renderGuard() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route
          path="/"
          element={
            <ProfileGuard>
              <div>protected</div>
            </ProfileGuard>
          }
        />
        <Route path="/onboarding" element={<div>onboarding</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProfileGuard', () => {
  beforeEach(() => {
    isComplete.mockReset().mockReturnValue(false);
    mockHydrated.mockReset().mockReturnValue(false);
  });

  it('does not redirect to onboarding before profile store has hydrated', () => {
    renderGuard();

    expect(screen.queryByText('onboarding')).not.toBeInTheDocument();
    expect(screen.queryByText('protected')).not.toBeInTheDocument();
  });

  it('redirects to onboarding after hydration when profile is incomplete', () => {
    mockHydrated.mockReturnValue(true);
    isComplete.mockReturnValue(false);

    renderGuard();

    expect(screen.getByText('onboarding')).toBeInTheDocument();
  });

  it('renders children after hydration when profile is complete', () => {
    mockHydrated.mockReturnValue(true);
    isComplete.mockReturnValue(true);

    renderGuard();

    expect(screen.getByText('protected')).toBeInTheDocument();
  });
});
