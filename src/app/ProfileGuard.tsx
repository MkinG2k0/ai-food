import { Navigate } from 'react-router-dom';
import { useProfileStore, useProfileHydrated } from '@/features/onboarding';

interface ProfileGuardProps {
  children: React.ReactNode;
}

export function ProfileGuard({ children }: ProfileGuardProps) {
  const hydrated = useProfileHydrated();
  const isComplete = useProfileStore((s) => s.isComplete());

  if (!hydrated) return null;
  if (!isComplete) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}
