import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useAuthStore } from '@/features/auth';
import { ConsentGuard } from './ConsentGuard';

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
    useAuthStore.setState({
      session: null,
      userToken: null,
      dataConsentAt: null,
      dataConsentVersion: null,
    });
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
