import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/features/auth';

interface ConsentGuardProps {
  children: React.ReactNode;
}

export function ConsentGuard({ children }: ConsentGuardProps) {
  const userToken = useAuthStore((state) => state.userToken);
  const dataConsentAt = useAuthStore((state) => state.dataConsentAt);
  const location = useLocation();

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
