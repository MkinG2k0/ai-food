import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
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
    }) => (open ? <div data-testid="edit-profile-sheet">{children}</div> : null),
  };
});

vi.mock('../model/syncNutritionProfileToServer', () => ({
  syncNutritionProfileToServer: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { useProfileStore } from '../model/useProfileStore';
import { EditProfileSheet } from './EditProfileSheet';

const profile = {
  gender: 'male' as const,
  age: 25,
  height: 180,
  weight: 75,
  targetWeight: 72,
  targetWeightDate: '2026-11-01',
  activity: 'medium' as const,
  goal: 'lose' as const,
  dietType: 'none' as const,
};

const targets = {
  kcal: 2200,
  protein: 130,
  fat: 70,
  carbs: 220,
  fiber: 30,
};

describe('EditProfileSheet', () => {
  beforeEach(() => {
    useProfileStore.setState({
      profile,
      targets,
      micronutrientTargets: null,
      suppressRemoteRestore: false,
    });
  });

  it('renders fields and saves diet type change', () => {
    const onClose = vi.fn();
    render(
      <EditProfileSheet open profile={profile} onClose={onClose} />,
    );

    expect(screen.getByText('Изменить профиль')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Халяль' }));
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(useProfileStore.getState().profile?.dietType).toBe('halal');
    expect(useProfileStore.getState().targets).toEqual(targets);
    expect(onClose).toHaveBeenCalled();
  });
});
