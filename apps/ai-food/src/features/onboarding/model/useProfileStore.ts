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
  setProfile: (profile: UserProfile, targets: DailyTargets) => void;
  setMicronutrientTargets: (targets: MicronutrientEstimate[]) => void;
  updateTargets: (targets: DailyTargets) => void;
  updateDietType: (dietType: DietType) => void;
  resetProfile: () => void;
  isComplete: () => boolean;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: null,
      targets: null,
      micronutrientTargets: null,
      setProfile: (profile, targets) => set({ profile, targets }),
      setMicronutrientTargets: (micronutrientTargets) => set({ micronutrientTargets }),
      updateTargets: (targets) => set({ targets }),
      updateDietType: (dietType) => {
        const { profile } = get();
        if (!profile) return;
        set({ profile: { ...profile, dietType } });
      },
      resetProfile: () =>
        set({ profile: null, targets: null, micronutrientTargets: null }),
      isComplete: () => get().profile !== null,
    }),
    {
      name: 'ai-food-profile',
      storage: createJSONStorage(() => capacitorStorage),
    },
  ),
);
