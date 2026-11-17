import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UsageSnapshot } from '@/features/auth';

const mocks = vi.hoisted(() => ({
  submitFood: vi.fn(),
  usage: undefined as UsageSnapshot | undefined,
  toastMessage: vi.fn(),
  showPaywall: vi.fn(),
}));

vi.mock('@/features/save-meal', () => ({
  useSaveMeal: () => mocks.submitFood,
}));

vi.mock('@/features/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/auth')>();
  return {
    ...actual,
    useUsage: () => ({ data: mocks.usage }),
  };
});

vi.mock('@/features/billing', () => ({
  showGenerationQuotaPaywall: (...args: unknown[]) => mocks.showPaywall(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    message: (...args: unknown[]) => mocks.toastMessage(...args),
    error: vi.fn(),
  },
}));

vi.mock('@/shared/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/ui')>();
  return {
    ...actual,
    BottomSheet: ({
      open,
      children,
    }: {
      open: boolean;
      onClose: () => void;
      children: React.ReactNode;
    }) => (open ? <div data-testid="add-food-sheet">{children}</div> : null),
  };
});

import { AddFoodSheet } from './AddFoodSheet';

function fileList(n: number): File[] {
  return Array.from(
    { length: n },
    (_, i) => new File([`x${i}`], `meal-${i}.jpg`, { type: 'image/jpeg' }),
  );
}

function renderSheet(): void {
  render(
    <MemoryRouter>
      <AddFoodSheet open onClose={vi.fn()} />
    </MemoryRouter>,
  );
}

function pickFiles(files: File[]): void {
  const input = screen.getByLabelText(/Выбор из галереи/);
  fireEvent.change(input, { target: { files } });
}

describe('AddFoodSheet gallery multi-select', () => {
  beforeEach(() => {
    mocks.submitFood.mockReset();
    mocks.toastMessage.mockReset();
    mocks.showPaywall.mockReset();
    mocks.usage = {
      used: 0,
      limit: 50,
      remaining: null,
      authenticated: false,
      hasActiveSubscription: true,
      freeGenerationLimit: 50,
      authLoginGenerationBonus: 0,
    };
  });

  it('submits one meal per photo, never images[]', () => {
    renderSheet();
    const picked = fileList(3);
    pickFiles(picked);

    expect(mocks.submitFood).toHaveBeenCalledTimes(3);
    for (let i = 0; i < 3; i += 1) {
      expect(mocks.submitFood).toHaveBeenNthCalledWith(i + 1, {
        image: picked[i],
      });
    }
    expect(
      mocks.submitFood.mock.calls.some(
        (call) => call[0] && typeof call[0] === 'object' && 'images' in call[0],
      ),
    ).toBe(false);
  });

  it('caps at 10 and toasts', () => {
    renderSheet();
    pickFiles(fileList(11));

    expect(mocks.toastMessage).toHaveBeenCalledWith(
      'Можно выбрать не больше 10 фото',
    );
    expect(mocks.submitFood).toHaveBeenCalledTimes(10);
  });

  it('truncates to remaining quota and toasts', () => {
    mocks.usage = {
      used: 47,
      limit: 50,
      remaining: 3,
      authenticated: false,
      hasActiveSubscription: false,
      freeGenerationLimit: 50,
      authLoginGenerationBonus: 0,
    };
    renderSheet();
    pickFiles(fileList(7));

    expect(mocks.toastMessage).toHaveBeenCalledWith('Хватит на 3 из 7');
    expect(mocks.submitFood).toHaveBeenCalledTimes(3);
  });

  it('opens paywall when quota is exhausted', () => {
    mocks.usage = {
      used: 50,
      limit: 50,
      remaining: 0,
      authenticated: false,
      hasActiveSubscription: false,
      freeGenerationLimit: 50,
      authLoginGenerationBonus: 0,
    };
    renderSheet();
    pickFiles(fileList(2));

    expect(mocks.submitFood).not.toHaveBeenCalled();
    expect(mocks.showPaywall).toHaveBeenCalled();
  });
});