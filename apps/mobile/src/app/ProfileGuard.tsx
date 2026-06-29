import { Navigate } from 'react-router-dom';
import { useProfileStore } from '@/features/onboarding';

interface ProfileGuardProps {
  children: React.ReactNode;
}

export function ProfileGuard({ children }: ProfileGuardProps) {
  const isComplete = useProfileStore((s) => s.isComplete());
  if (!isComplete) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}
