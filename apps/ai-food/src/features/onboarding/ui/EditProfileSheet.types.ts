import type { UserProfile } from '@ai-food/shared-types';

export interface EditProfileSheetProps {
  open: boolean;
  profile: UserProfile;
  onClose: () => void;
  className?: string;
}
