import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/auth', () => ({
  TelegramBotLoginButton: () => <button>Войти через Telegram</button>,
  useAuthStore: (selector: (state: { session: null }) => unknown) =>
    selector({ session: null }),
}));

describe('StepGender', () => {
  it('shows Telegram login when the user is signed out', async () => {
    const { StepGender } = await import('./StepGender');

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
