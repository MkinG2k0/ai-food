import { Navigate, useLocation } from 'react-router-dom';
import { useAuthHydrated, useAuthStore } from '@/features/auth';

interface ConsentGuardProps {
  children: React.ReactNode;
}

export function ConsentGuard({ children }: ConsentGuardProps) {
  const hydrated = useAuthHydrated();
  const userToken = useAuthStore((state) => state.userToken);
  const dataConsentAt = useAuthStore((state) => state.dataConsentAt);
  const location = useLocation();

  if (!hydrated) return null;

  if (userToken && !dataConsentAt) {
    return (
      <Navigate
        to="/consent"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return <>{children}</>;
}
