import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useAuthStore } from '@/features/auth';
import { ConsentGuard } from './ConsentGuard';

const mockHydrated = vi.fn(() => true);

vi.mock('@/features/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/auth')>()),
  useAuthHydrated: () => mockHydrated(),
}));

function renderGuard() {
  return render(
    <MemoryRouter initialEntries={['/settings']}>
      <Routes>
        <Route
          path="/settings"
          element={
            <ConsentGuard>
              <div>protected</div>
            </ConsentGuard>
          }
        />
        <Route path="/consent" element={<div>consent</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ConsentGuard', () => {
  beforeEach(() => {
    mockHydrated.mockReset().mockReturnValue(true);
    useAuthStore.setState({
      session: null,
      userToken: null,
      dataConsentAt: null,
      dataConsentVersion: null,
    });
  });

  it('renders nothing before auth store hydration finishes', () => {
    mockHydrated.mockReturnValue(false);
    useAuthStore.setState({ userToken: 'jwt-token' });

    renderGuard();

    expect(screen.queryByText('consent')).not.toBeInTheDocument();
    expect(screen.queryByText('protected')).not.toBeInTheDocument();
  });

  it('redirects authenticated users without consent', () => {
    useAuthStore.setState({ userToken: 'jwt-token' });

    renderGuard();

    expect(screen.getByText('consent')).toBeInTheDocument();
  });

  it('renders children for authenticated users with consent', () => {
    useAuthStore.setState({
      userToken: 'jwt-token',
      dataConsentAt: '2026-08-06T00:00:00.000Z',
    });

    renderGuard();

    expect(screen.getByText('protected')).toBeInTheDocument();
  });

  it('renders children for logged-out users', () => {
    renderGuard();

    expect(screen.getByText('protected')).toBeInTheDocument();
  });
});
