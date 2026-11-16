import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { friendsErrorMessage } from '@/features/friends';

type FriendProfilePageParams = {
  error: unknown;
  loggedIn: boolean;
};

export function useFriendProfilePage({
  error,
  loggedIn,
}: FriendProfilePageParams): void {
  const navigate = useNavigate();

  useEffect(() => {
    if (!loggedIn) {
      navigate('/login', { replace: true });
    }
  }, [loggedIn, navigate]);

  useEffect(() => {
    if (!error) return;
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: string }).code)
        : undefined;
    const message = friendsErrorMessage(code);
    if (message) toast.error(message);
  }, [error]);
}