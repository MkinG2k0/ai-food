import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  hydrated: true,
  lastSeenDate: null as string | null,
  dismissLatest: vi.fn(),
}));

vi.mock('../model/useNewsSeenHydrated', () => ({
  useNewsSeenHydrated: () => mocks.hydrated,
}));

vi.mock('../model/useNewsSeenStore', () => ({
  useNewsSeenStore: (
    selector: (state: {
      lastSeenDate: string | null;
      dismissLatest: (date: string) => void;
    }) => unknown,
  ) =>
    selector({
      lastSeenDate: mocks.lastSeenDate,
      dismissLatest: mocks.dismissLatest,
    }),
}));

vi.mock('@/shared/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/ui')>();
  return {
    ...actual,
    BottomSheet: ({
      open,
      onClose,
      children,
    }: {
      open: boolean;
      onClose: () => void;
      children: React.ReactNode;
    }) =>
      open ? (
        <div data-testid="news-sheet">
          <button type="button" aria-label="Закрыть" onClick={onClose}>
            backdrop
          </button>
          {children}
        </div>
      ) : null,
  };
});

import { LatestNewsSheet } from './LatestNewsSheet';

describe('LatestNewsSheet', () => {
  beforeEach(() => {
    mocks.hydrated = true;
    mocks.lastSeenDate = null;
    mocks.dismissLatest.mockReset();
  });

  it('marks release seen when «Понятно» is clicked', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LatestNewsSheet />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Понятно' }));

    expect(mocks.dismissLatest).toHaveBeenCalledWith(
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    );
  });

  it('marks release seen when backdrop is dismissed', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LatestNewsSheet />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Закрыть' }));

    expect(mocks.dismissLatest).toHaveBeenCalledTimes(1);
  });

  it('marks release seen when suppressed while unseen', () => {
    render(
      <MemoryRouter>
        <LatestNewsSheet suppressed />
      </MemoryRouter>,
    );

    expect(mocks.dismissLatest).toHaveBeenCalledWith(
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    );
  });

  it('does not render when release was already dismissed', () => {
    mocks.lastSeenDate = '2026-09-24';
    render(
      <MemoryRouter>
        <LatestNewsSheet />
      </MemoryRouter>,
    );

    expect(screen.queryByTestId('news-sheet')).not.toBeInTheDocument();
  });
});
