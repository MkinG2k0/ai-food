import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { UserProfile, DailyTargets, DietType } from '@ai-food/shared-types';
import { capacitorStorage } from '@/shared/lib';

interface ProfileState {
  profile: UserProfile | null;
  targets: DailyTargets | null;
  setProfile: (profile: UserProfile, targets: DailyTargets) => void;
  updateDietType: (dietType: DietType) => void;
  resetProfile: () => void;
  isComplete: () => boolean;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: null,
      targets: null,
      setProfile: (profile, targets) => set({ profile, targets }),
      updateDietType: (dietType) => {
        const { profile } = get();
        if (!profile) return;
        set({ profile: { ...profile, dietType } });
      },
      resetProfile: () => set({ profile: null, targets: null }),
      isComplete: () => get().profile !== null,
    }),
    {
      name: 'ai-food-profile',
      storage: createJSONStorage(() => capacitorStorage),
    }
  )
);
