import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { StepGender } from './StepGender';

vi.mock('@/features/auth', () => ({
  TelegramBotLoginButton: () => <button>Войти через Telegram</button>,
  useAuthStore: (selector: (state: { session: null }) => unknown) =>
    selector({ session: null }),
}));

vi.mock('@/features/diary-sync', () => ({
  queueFullUserDataSync: vi.fn(),
}));

vi.mock('../../model/reconcileNutritionProfileAfterLogin', () => ({
  reconcileNutritionProfileAfterLogin: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

describe('StepGender', () => {
  it('shows Telegram login when the user is signed out', () => {
    render(
      <MemoryRouter>
        <StepGender onNext={vi.fn()} />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('button', { name: 'Войти через Telegram' }),
    ).toBeInTheDocument();
  });
});
