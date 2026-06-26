import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile, DailyTargets } from '@ai-food/shared-types';

interface ProfileState {
  profile: UserProfile | null;
  targets: DailyTargets | null;
  setProfile: (profile: UserProfile, targets: DailyTargets) => void;
  isComplete: () => boolean;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: null,
      targets: null,
      setProfile: (profile, targets) => set({ profile, targets }),
      isComplete: () => get().profile !== null,
    }),
    { name: 'ai-food-profile' }
  )
);
