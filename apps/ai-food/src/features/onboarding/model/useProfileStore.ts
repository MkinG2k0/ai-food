import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type {
  UserProfile,
  DailyTargets,
  DietType,
  MicronutrientEstimate,
} from '@ai-food/shared-types';
import { capacitorStorage } from '@/shared/lib';

interface ProfileState {
  profile: UserProfile | null;
  targets: DailyTargets | null;
  micronutrientTargets: MicronutrientEstimate[] | null;
  /** After "redo onboarding": skip auto-restore from server until setProfile. */
  suppressRemoteRestore: boolean;
  setProfile: (profile: UserProfile, targets: DailyTargets) => void;
  setMicronutrientTargets: (targets: MicronutrientEstimate[] | null) => void;
  updateTargets: (targets: DailyTargets) => void;
  updateDietType: (dietType: DietType) => void;
  updateTargetWeight: (targetWeight: number) => void;
  resetProfile: () => void;
  isComplete: () => boolean;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: null,
      targets: null,
      micronutrientTargets: null,
      suppressRemoteRestore: false,
      setProfile: (profile, targets) =>
        set({ profile, targets, suppressRemoteRestore: false }),
      setMicronutrientTargets: (micronutrientTargets) => set({ micronutrientTargets }),
      updateTargets: (targets) => set({ targets }),
      updateDietType: (dietType) => {
        const { profile } = get();
        if (!profile) return;
        set({ profile: { ...profile, dietType } });
      },
      updateTargetWeight: (targetWeight) => {
        const { profile } = get();
        if (!profile) return;
        const kg = Math.min(300, Math.max(20, Math.round(targetWeight * 10) / 10));
        set({ profile: { ...profile, targetWeight: kg } });
      },
      resetProfile: () =>
        set({
          profile: null,
          targets: null,
          micronutrientTargets: null,
          suppressRemoteRestore: true,
        }),
      isComplete: () => get().profile !== null,
    }),
    {
      name: 'ai-food-profile',
      storage: createJSONStorage(() => capacitorStorage),
    },
  ),
);
