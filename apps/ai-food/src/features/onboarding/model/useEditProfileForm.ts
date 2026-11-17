import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { UserProfile } from '@ai-food/shared-types';
import { useWeightStore } from '@/features/stats';
import {
  draftFromProfile,
  parseProfileDraft,
  type ProfileDraft,
} from './profileDraft';
import { syncNutritionProfileToServer } from './syncNutritionProfileToServer';
import { useProfileStore } from './useProfileStore';

export interface UseEditProfileFormParams {
  open: boolean;
  profile: UserProfile;
  onSaved: () => void;
}

export interface UseEditProfileFormResult {
  canSave: boolean;
  draft: ProfileDraft;
  setDraft: (patch: Partial<ProfileDraft>) => void;
  save: () => void;
}

export function useEditProfileForm({
  open,
  profile,
  onSaved,
}: UseEditProfileFormParams): UseEditProfileFormResult {
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const [draft, setDraftState] = useState<ProfileDraft>(() =>
    draftFromProfile(profile),
  );
  const [initialDate, setInitialDate] = useState(profile.targetWeightDate);

  useEffect(() => {
    if (!open) return;
    setDraftState(draftFromProfile(profile));
    setInitialDate(profile.targetWeightDate);
  }, [open, profile]);

  const setDraft = (patch: Partial<ProfileDraft>): void => {
    setDraftState((prev) => ({ ...prev, ...patch }));
  };

  const parsed = parseProfileDraft(draft, profile, initialDate);
  const canSave = parsed != null;

  const save = (): void => {
    const next = parseProfileDraft(draft, profile, initialDate);
    if (!next) {
      toast.error('Проверьте поля профиля');
      return;
    }
    updateProfile(next);
    useWeightStore.getState().setGoalKg(next.targetWeight);
    syncNutritionProfileToServer();
    toast.success('Профиль обновлён');
    onSaved();
  };

  return { canSave, draft, setDraft, save };
}
